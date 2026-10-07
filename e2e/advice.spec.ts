import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";

test("advice previews a compact diary, persists feedback and follow-ups, and deletes the conversation", async ({
  page,
  request,
}) => {
  for (const route of ["threads", "respond"])
    expect(
      (await request.post(`/api/advice/${route}`, { data: {} })).status(),
    ).toBe(401);
  await page.goto("/login");
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  expect(
    (
      await page.request.post("/api/advice/threads", {
        headers: { origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const saved = await page.request.post("/api/nutrition/meals", {
    headers: { origin: "http://localhost:3100" },
    data: {
      id: randomUUID(),
      date: "2026-08-12",
      category: "Mittagessen",
      description: "Kartoffeln mit Quark",
      calories: 500,
      caloriesLow: 450,
      caloriesHigh: 550,
      source: "estimated",
      assumptions: "300 g Kartoffeln, 200 g Quark",
      version: 0,
    },
  });
  expect(saved.ok()).toBe(true);
  await page.goto("/advice");
  await page.getByLabel("Dein Fokus (optional)").fill("Regelmäßiger essen");
  await page.getByLabel("Sieben Tage bis einschließlich").fill("2026-08-12");
  await page
    .getByRole("button", { name: "Zusammenfassung vorbereiten" })
    .click();
  await expect(page).toHaveURL(/\/advice\/[a-f0-9-]+$/);
  const url = page.url();
  await expect(
    page.getByText("Kalorien unbekannt", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Kartoffeln mit Quark", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Dein Beratungsgespräch" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Deine Frage", { exact: true })
    .fill("Wie kann ich meine Mahlzeiten besser planen?");
  await page
    .getByText("Über ChatGPT kopieren & importieren", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "ChatGPT-Anfrage vorbereiten" })
    .click();
  await expect(page.getByLabel("Anfrage für ChatGPT")).toHaveValue(
    /Kartoffeln mit Quark/,
  );
  await page
    .getByLabel("Antwort aus ChatGPT")
    .fill(
      JSON.stringify({
        answer:
          "Du hast eine Mahlzeit erfasst. Plane Zeit für deine Mittagspause ein und notiere weitere Mahlzeiten, wenn du möchtest.",
      }),
    );
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  const conversation = page.getByRole("region", {
    name: "Dein Beratungsgespräch",
  });
  await expect(conversation).toContainText(
    "Plane Zeit für deine Mittagspause ein",
  );
  await page.reload();
  await expect(conversation).toContainText(
    "Plane Zeit für deine Mittagspause ein",
  );
  await page
    .getByLabel("Deine Frage", { exact: true })
    .fill("Wie bereite ich das für einen Bürotag vor?");
  await page
    .getByText("Über ChatGPT kopieren & importieren", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "ChatGPT-Anfrage vorbereiten" })
    .click();
  await expect(page.getByLabel("Anfrage für ChatGPT")).toHaveValue(
    /Plane Zeit für deine Mittagspause ein/,
  );
  await expect(page.getByLabel("Anfrage für ChatGPT")).toHaveValue(/Bürotag/);
  await page
    .getByLabel("Antwort aus ChatGPT")
    .fill(
      JSON.stringify({
        answer:
          "Packe die vorbereitete Mahlzeit am Vorabend ein. <img src=x onerror=alert(1)>",
      }),
    );
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(conversation.getByRole("article")).toHaveCount(2);
  await expect(conversation.locator("img")).toHaveCount(0);
  await page.reload();
  await expect(conversation.getByRole("article")).toHaveCount(2);
  const stale = await page.request.post("/api/advice/respond", {
    headers: { origin: "http://localhost:3100" },
    data: {
      id: url.split("/").pop(),
      version: 0,
      question: "Veraltete Frage",
      mode: "import",
      reply: '{"answer":"Veraltet"}',
    },
  });
  expect(stale.status()).toBe(409);
  for (const width of [320, 375, 390, 430]) {
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
    path: "test-results/advice-mobile.png",
    fullPage: true,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Gespräch aus Fitmin löschen" })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/advice");
  await expect(
    page.getByRole("link", { name: /Regelmäßiger essen/ }),
  ).toHaveCount(0);
});
