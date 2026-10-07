import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("diary records text and manual ChatGPT estimates, persists edits and protects routes", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/nutrition/meals")).status()).toBe(401);
  expect(
    (await request.post("/api/nutrition/estimate", { data: {} })).status(),
  ).toBe(401);
  await page.goto("/login");
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  expect(
    (
      await page.request.post("/api/nutrition/meals", {
        headers: { origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.goto("/diary?date=2026-10-07");
  await page
    .getByLabel("Was und wie viel?")
    .fill("60 g Haferflocken mit 200 ml Milch und einer Banane");
  await page
    .getByText("Über ChatGPT kopieren & importieren", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "ChatGPT-Anfrage vorbereiten" })
    .click();
  await expect(page.getByLabel("Anfrage für ChatGPT")).toHaveValue(
    /60 g Haferflocken/,
  );
  await page.getByLabel("Antwort aus ChatGPT").fill('{"calories":450');
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "vollständiges JSON",
  );
  await expect(page.getByLabel("Unveränderter Antworttext")).toHaveValue(
    '{"calories":450',
  );
  await page.getByLabel("Antwort aus ChatGPT").fill(
    JSON.stringify({
      calories: 450,
      caloriesLow: 400,
      caloriesHigh: 500,
      assumptions: "60 g Flocken, 200 ml Milch, mittelgroße Banane",
      clarification: "",
    }),
  );
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Geschätzt: 450 kcal" }),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get("/api/nutrition/meals?date=2026-10-07")
      ).json()
    ).length,
  ).toBe(0);
  await page.getByRole("button", { name: "Mahlzeit speichern" }).click();
  await expect(
    page.getByRole("heading", { name: "ca. 450 kcal" }),
  ).toBeVisible();
  await page.reload();
  const entry = page
    .getByRole("article")
    .filter({ hasText: "60 g Haferflocken" });
  await expect(entry).toContainText("400–500 kcal");
  await entry.getByRole("button", { name: "Bearbeiten" }).click();
  await page
    .getByLabel("Was und wie viel?")
    .fill("80 g Haferflocken mit Milch");
  await expect(
    page.getByRole("heading", { name: "Geschätzt: 450 kcal" }),
  ).toHaveCount(0);
  await page.getByText("Kalorien selbst eintragen", { exact: true }).click();
  await page.getByLabel("Kalorien in kcal (optional)").fill("520");
  await page.getByRole("button", { name: "Mahlzeit speichern" }).click();
  await expect(
    page.getByRole("heading", { name: "520 kcal", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Was und wie viel?").fill("Kaffee mit etwas Milch");
  await page.getByRole("button", { name: "Mahlzeit speichern" }).click();
  await expect(
    page.getByText(/2 Mahlzeiten erfasst · 1 davon ohne Kalorien/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vorheriger Tag" }).click();
  await expect(
    page.getByRole("heading", { name: "Noch keine Kalorien erfasst" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nächster Tag" }).click();
  await expect(
    page.getByRole("heading", { name: "520 kcal", exact: true }),
  ).toBeVisible();
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
    path: "test-results/nutrition-diary.png",
    fullPage: true,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("article")
    .filter({ hasText: "Kaffee mit etwas Milch" })
    .getByRole("button", { name: "Löschen" })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
});
