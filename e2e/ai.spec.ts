import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { proposal } from "../tests/fixtures/ai";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
}
async function enableAssistant(page: Page) {
  await page.route("**/api/ai/config", (route) =>
    route.fulfill({ json: { available: true } }),
  );
}

test("AI routes require login/origin and missing key leaves manual editor usable", async ({
  page,
  request,
}) => {
  for (const path of ["plan", "transcribe", "accept"])
    expect((await request.post(`/api/ai/${path}`, { data: {} })).status()).toBe(
      401,
    );
  expect((await request.get("/api/ai/config")).status()).toBe(401);
  await login(page);
  const csrf = await page.request.post("/api/ai/accept", {
    headers: { origin: "https://evil.example" },
    data: { name: proposal.name, days: proposal.days },
  });
  expect(csrf.status()).toBe(403);
  await page.goto("/plans/new");
  await expect(
    page.getByText("Der KI-Assistent ist noch nicht eingerichtet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vorschläge erstellen →" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Planname")).toBeEditable();
  const missing = await page.request.post("/api/ai/plan", {
    headers: { origin: "http://localhost:3100" },
    data: {},
  });
  expect(missing.status()).toBe(503);
  const res = await page.request.get("/plans/new");
  expect(res.headers()["permissions-policy"]).toContain("microphone=(self)");
});

test("optional profile, explicit review, accepted-only import and normal plan save", async ({
  page,
}) => {
  await enableAssistant(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/ai/plan", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: proposal });
  });
  await login(page);
  const before = (await (await page.request.get("/api/exercises")).json()) as {
    name: string;
  }[];
  const plansBefore = await (await page.request.get("/api/plans")).json();
  await page.goto("/plans/new");
  await page
    .getByLabel("Deine Trainingswünsche")
    .fill(
      "Ich will Bankdrücken mit 80 kg und Klimmzüge für Muskelaufbau trainieren.",
    );
  await page
    .getByText("Über dich & dein Training · optional", { exact: true })
    .click();
  await page.getByLabel("Alter in Jahren").fill("30");
  await page.getByLabel("Größe in cm").fill("180");
  await page.getByLabel("Körpergewicht in kg").fill("85");
  await page.getByLabel("Trainingsfokus", { exact: true }).fill("Muskelaufbau");
  await page.getByLabel("Trainingstage pro Woche").selectOption("2");
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await expect(
    page.getByRole("heading", { name: `Dein Vorschlag: ${proposal.name}` }),
  ).toBeVisible();
  expect(submitted?.profile).toMatchObject({
    age: 30,
    heightCm: 180,
    weightKg: 85,
    focus: "Muskelaufbau",
    daysPerWeek: 2,
  });
  const apply = page.getByRole("button", {
    name: "Auswahl in den Plan übernehmen",
  });
  await expect(apply).toBeDisabled();
  expect((await (await page.request.get("/api/exercises")).json()).length).toBe(
    before.length,
  );
  await page
    .getByRole("button", { name: "Bankdrücken annehmen, Oberkörper A" })
    .click();
  await expect(apply).toBeDisabled();
  await page
    .getByRole("button", { name: "Klimmzüge ablehnen, Oberkörper A" })
    .click();
  await expect(apply).toBeEnabled();
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/ai-assistant-mobile.png",
    fullPage: true,
  });
  await apply.click();
  await expect(page.getByLabel("Planname")).toHaveValue(proposal.name);
  await expect(page.getByLabel("Start kg")).toHaveValue("80");
  const after = await (await page.request.get("/api/exercises")).json();
  expect(after.length).toBe(before.length + 1);
  expect(after.some((e: { name: string }) => e.name === "Klimmzüge")).toBe(
    false,
  );
  expect((await (await page.request.get("/api/plans")).json()).length).toBe(
    plansBefore.length,
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /ai|profile|audio/i.test(k)),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Plan speichern", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plans$/);
  await expect(
    page.getByRole("heading", { name: proposal.name, exact: true }),
  ).toBeVisible();
});

test("recording only uploads after action, transcript stays editable and drafts need replacement confirmation", async ({
  page,
  context,
}) => {
  await enableAssistant(page);
  await context.grantPermissions(["microphone"], {
    origin: "http://localhost:3100",
  });
  let uploads = 0;
  await page.route("**/api/ai/transcribe", async (route) => {
    uploads++;
    expect(route.request().postDataBuffer()!.length).toBeGreaterThan(16);
    await route.fulfill({
      json: { text: "Ich möchte Bankdrücken und Klimmzüge trainieren." },
    });
  });
  await page.route("**/api/ai/plan", (route) =>
    route.fulfill({ json: proposal }),
  );
  await login(page);
  await page.goto("/plans/new");
  await page.getByLabel("Planname").fill("Mein vorhandener Entwurf");
  await page.getByRole("button", { name: "Einsprechen", exact: true }).click();
  await expect(page.getByText(/Aufnahme läuft · [1-9]/)).toBeVisible();
  await page
    .getByRole("button", { name: "Aufnahme stoppen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aufnahme transkribieren", exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(0);
  await page
    .getByRole("button", { name: "Aufnahme transkribieren", exact: true })
    .click();
  await expect(page.getByLabel("Deine Trainingswünsche")).toHaveValue(
    "Ich möchte Bankdrücken und Klimmzüge trainieren.",
  );
  expect(uploads).toBe(1);
  await page
    .getByLabel("Deine Trainingswünsche")
    .fill("Ich möchte Bankdrücken mit 80 kg und Klimmzüge trainieren.");
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await page
    .getByRole("button", { name: "Bankdrücken annehmen, Oberkörper A" })
    .click();
  await page
    .getByRole("button", { name: "Klimmzüge ablehnen, Oberkörper A" })
    .click();
  const apply = page.getByRole("button", {
    name: "Auswahl in den Plan übernehmen",
  });
  await expect(apply).toBeDisabled();
  await expect(page.getByLabel("Planname")).toHaveValue(
    "Mein vorhandener Entwurf",
  );
  await page
    .getByRole("checkbox", { name: /Meinen aktuellen Editorentwurf/ })
    .check();
  await expect(apply).toBeEnabled();
  await page
    .getByLabel("Deine Trainingswünsche")
    .fill("Jetzt möchte ich doch ausschließlich meine Beine trainieren.");
  await expect(apply).toBeDisabled();
  await expect(page.getByText(/Deine Angaben wurden geändert/)).toBeVisible();
});

test("microphone denial and failed generation keep typing and retry available", async ({
  page,
}) => {
  await enableAssistant(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
    });
  });
  await page.route("**/api/ai/plan", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "KI-Limit erreicht. Bitte später erneut versuchen." },
    }),
  );
  await login(page);
  await page.goto("/plans/new");
  await page.getByRole("button", { name: "Einsprechen", exact: true }).click();
  await expect(page.getByText(/Mikrofonzugriff abgelehnt/)).toBeVisible();
  await page
    .getByLabel("Deine Trainingswünsche")
    .fill("Ich möchte einen einfachen Ganzkörperplan.");
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await expect(
    page.getByText("KI-Limit erreicht. Bitte später erneut versuchen.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Deine Trainingswünsche")).toHaveValue(
    "Ich möchte einen einfachen Ganzkörperplan.",
  );
  await expect(
    page.getByRole("button", { name: "Vorschläge erstellen →" }),
  ).toBeEnabled();
});
