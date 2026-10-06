import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { proposal, assistantInput } from "../tests/fixtures/ai";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
}
async function enableAssistant(page: Page, needsWelcome = false) {
  await page.route("**/api/ai/chatgpt", (route) => {
    if (route.request().method() === "POST") {
      needsWelcome = false;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      json: { models: [{ id: "account-model", name: "Testmodell" }] },
    });
  });
  await page.route("**/api/ai/config", (route) =>
    route.fulfill({
      json: {
        available: true,
        local: true,
        active: "mock-account",
        accounts: [
          {
            id: "mock-account",
            label: "Testkonto",
            connected: true,
            model: "account-model",
          },
        ],
        needsWelcome,
        pending: false,
        message: "",
      },
    }),
  );
}

test("AI routes require login/origin and paid transcription stays disabled even with API key", async ({
  page,
  request,
}) => {
  for (const path of ["plan", "transcribe", "accept", "chatgpt", "prompt"])
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
    page.getByText("Mit deinem ChatGPT-Abo · ohne API-Key", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vorschläge erstellen →" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Planname")).toBeEditable();
  const missing = await page.request.post("/api/ai/plan", {
    headers: { origin: "http://localhost:3100" },
    data: assistantInput,
  });
  expect(missing.status()).toBe(409);
  const audio = await page.request.post("/api/ai/transcribe", {
    headers: { origin: "http://localhost:3100", "Content-Type": "audio/webm" },
    data: "old-tab-audio",
  });
  expect(audio.status()).toBe(410);
  expect(await audio.text()).toContain("deaktiviert");
  const res = await page.request.get("/plans/new");
  expect(res.headers()["permissions-policy"]).toContain("microphone=(self)");
});

test("optional profile, explicit review, accepted-only import and normal plan save", async ({
  page,
}) => {
  await enableAssistant(page, true);
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/ai/plan", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      json: {
        proposal,
        reply: {
          text: JSON.stringify(proposal),
          status: "completed",
          truncated: false,
        },
      },
    });
  });
  await login(page);
  const before = (await (await page.request.get("/api/exercises")).json()) as {
    name: string;
  }[];
  const plansBefore = await (await page.request.get("/api/plans")).json();
  await page.goto("/plans/new");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Verstanden", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveTitle("Fitmin");
  await expect(
    page.getByRole("link", { name: "Fitmin – Startseite" }),
  ).toBeVisible();

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

test("browser dictation never uploads audio and drafts need replacement confirmation", async ({
  page,
}) => {
  await enableAssistant(page);
  await mockDictation(page);
  let uploads = 0;
  let submittedWishes = "";
  page.on("request", (req) => {
    if (req.url().includes("/api/ai/transcribe")) uploads++;
  });
  await page.route("**/api/ai/plan", (route) => {
    submittedWishes = route.request().postDataJSON().wishes;
    return route.fulfill({
      json: {
        proposal,
        reply: {
          text: JSON.stringify(proposal),
          status: "completed",
          truncated: false,
        },
      },
    });
  });
  await login(page);
  await page.goto("/plans/new");
  await page.getByLabel("Planname").fill("Mein vorhandener Entwurf");
  await page.getByRole("button", { name: "Einsprechen", exact: true }).click();
  await expect(page.getByText(/Diktieren läuft/)).toBeVisible();
  await expect(page.getByLabel("Erkannter Text")).toHaveValue(
    "Ich möchte Bankdrücken und Klimmzüge trainieren.",
  );
  await page
    .getByRole("button", { name: "Diktieren stoppen", exact: true })
    .click();
  await expect(page.getByLabel("Erkannter Text")).toHaveValue(
    "Ich möchte Bankdrücken mit 80 kg und Klimmzüge trainieren.",
  );
  await page
    .getByRole("button", { name: "Text übernehmen", exact: true })
    .click();
  await expect(page.getByLabel("Deine Trainingswünsche")).toHaveValue(
    "Ich möchte Bankdrücken mit 80 kg und Klimmzüge trainieren.",
  );
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await page
    .getByRole("button", { name: "Bankdrücken annehmen, Oberkörper A" })
    .click();
  expect(submittedWishes).toBe(
    "Ich möchte Bankdrücken mit 80 kg und Klimmzüge trainieren.",
  );
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
  // Second recognition has only interim text and deliberately never emits end.
  await page.getByRole("button", { name: "Einsprechen", exact: true }).click();
  await expect(page.getByLabel("Erkannter Text")).toHaveValue(
    "Nur vorläufig erkannt.",
  );
  await page
    .getByRole("button", { name: "Diktieren stoppen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Text übernehmen", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Erkannter Text")).toHaveValue(
    "Nur vorläufig erkannt.",
  );
  await page
    .getByRole("button", { name: "Diktat verwerfen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Einsprechen", exact: true }),
  ).toBeEnabled();
});

test("microphone denial and failed generation keep typing and retry available", async ({
  page,
}) => {
  await enableAssistant(page);
  await mockDictation(page, true);
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

async function mockDictation(page: Page, denied = false) {
  await page.addInitScript((denied) => {
    let count = 0;
    class Speech {
      index = count++;
      lang = "";
      continuous = true;
      interimResults = true;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          if (denied) this.onerror?.({ error: "not-allowed" });
          else if (this.index === 1)
            this.onresult?.({
              results: [
                { isFinal: false, 0: { transcript: "Nur vorläufig erkannt." } },
              ],
            });
          else
            this.onresult?.({
              results: [
                {
                  isFinal: true,
                  0: {
                    transcript: "Ich möchte Bankdrücken",
                  },
                },
                {
                  isFinal: false,
                  0: { transcript: "und Klimmzüge trainieren." },
                },
              ],
            });
        }, 10);
      }
      stop() {
        if (denied) {
          this.onend?.();
          return;
        }
        if (this.index === 1) return;
        setTimeout(() => {
          this.onresult?.({
            results: [
              {
                isFinal: true,
                0: { transcript: "Ich möchte Bankdrücken mit 80 kg" },
              },
            ],
          });
          this.onend?.();
        }, 100);
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Speech,
      configurable: true,
    });
  }, denied);
}

test("manual ChatGPT roundtrip works without a subscription connection and validates pasted output", async ({
  page,
}) => {
  await page.route("**/api/ai/config", (route) =>
    route.fulfill({
      json: {
        available: false,
        local: false,
        active: null,
        accounts: [],
        pending: false,
        message: "",
      },
    }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  let inferenceCalls = 0;
  page.on("request", (req) => {
    if (/\/api\/ai\/(plan|transcribe)$/.test(req.url())) inferenceCalls++;
  });
  await login(page);
  await page.goto("/plans/new");
  await page.getByRole("button", { name: "Einsprechen", exact: true }).click();
  await expect(
    page.getByText(/Dieser Browser bietet keine Diktierfunktion/),
  ).toBeVisible();
  await page
    .getByLabel("Deine Trainingswünsche")
    .fill("Ich möchte Bankdrücken und Klimmzüge trainieren.");
  await page
    .getByRole("button", { name: "ChatGPT-Anfrage vorbereiten" })
    .click();
  await expect(page.getByLabel("Anfrage für ChatGPT")).toHaveValue(
    /Meine Angaben/,
  );
  await page.getByLabel("Antwort aus ChatGPT").fill('{"name":"broken"}');
  await page.getByRole("button", { name: "Vorschlag prüfen" }).click();
  await expect(
    page.getByText(/Der KI-Entwurf enthielt ungültige Werte/),
  ).toBeVisible();
  await page
    .getByLabel("Antwort aus ChatGPT")
    .fill("```json\n" + JSON.stringify(proposal) + "\n```");
  await page.getByRole("button", { name: "Vorschlag prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: `Dein Vorschlag: ${proposal.name}` }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bankdrücken annehmen, Oberkörper A" })
    .click();
  await page
    .getByRole("button", { name: "Klimmzüge ablehnen, Oberkörper A" })
    .click();
  await page
    .getByRole("button", { name: "Auswahl in den Plan übernehmen" })
    .click();
  await expect(page.getByLabel("Planname")).toHaveValue(proposal.name);
  expect(inferenceCalls).toBe(0);
});

test("local OAuth handshake opens a loopback listener, rejects forged callbacks and can be cancelled", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.post("/api/ai/chatgpt", {
    headers: { origin: "http://localhost:3100" },
    data: { action: "connect" },
  });
  expect(response.status()).toBe(200);
  const url = new URL((await response.json()).url);
  expect(url.origin).toBe("https://auth.openai.com");
  expect(url.searchParams.get("client_id")).toBe("dynamic_agent_client");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  const callback = new URL(url.searchParams.get("redirect_uri")!);
  expect(callback.hostname).toBe("127.0.0.1");
  callback.searchParams.set("state", "forged");
  expect((await page.request.get(callback.href)).status()).toBe(403);
  expect(
    (await (await page.request.get("/api/ai/config")).json()).pending,
  ).toBe(true);
  await page.request.post("/api/ai/chatgpt", {
    headers: { origin: "http://localhost:3100" },
    data: { action: "cancel" },
  });
  const status = await (await page.request.get("/api/ai/config")).json();
  expect(status.pending).toBe(false);
  expect(status.available).toBe(false);
});

test("original ChatGPT answer stays inspectable on failure and success, with no automatic retries or HTML execution", async ({
  page,
}) => {
  await enableAssistant(page);
  const raw =
    'Hier ist mein Vorschlag, leider ohne JSON.\n<img src=x onerror="alert(1)">';
  let calls = 0;
  await page.route("**/api/ai/plan", (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({
          status: 502,
          json: {
            error:
              "ChatGPT hat keinen eindeutig lesbaren Trainingsplan geliefert. Die Originalantwort ist unten einsehbar; es wurde nichts übernommen.",
            reply: { text: raw, status: "completed", truncated: false },
          },
        })
      : route.fulfill({
          json: {
            proposal,
            reply: {
              text: JSON.stringify(proposal),
              status: "completed",
              truncated: false,
            },
          },
        });
  });
  await login(page);
  await page.goto("/plans/new");
  await page.getByLabel("Deine Trainingswünsche").fill(assistantInput.wishes);
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await expect(page.locator(".assistant").getByRole("alert")).toContainText(
    "Originalantwort",
  );
  await expect(
    page.getByLabel("Unveränderter Antworttext", { exact: true }),
  ).toHaveValue(raw);
  await expect(page.locator(".model-reply img")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Auswahl in den Plan übernehmen" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Deine Trainingswünsche")).toHaveValue(
    assistantInput.wishes,
  );
  expect(calls).toBe(1);
  await page
    .getByRole("button", { name: "Antwort kopieren", exact: true })
    .click();
  await expect(page.locator(".model-reply").getByRole("status")).toContainText(
    /Antwort kopiert|kopiere ihn manuell/,
  );
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/fitmin-original-answer.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Vorschläge erstellen →" }).click();
  await expect(
    page.getByRole("heading", { name: `Dein Vorschlag: ${proposal.name}` }),
  ).toBeVisible();
  await page.getByText("Originalantwort von ChatGPT", { exact: true }).click();
  await expect(
    page.getByLabel("Unveränderter Antworttext", { exact: true }),
  ).toHaveValue(JSON.stringify(proposal));
  expect(calls).toBe(2);
  await page
    .getByRole("button", { name: "Antwort ausblenden", exact: true })
    .click();
  await expect(
    page.getByLabel("Unveränderter Antworttext", { exact: true }),
  ).toHaveCount(0);
});
