import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
test("protected routes, login, mobile autosave, recovery and logout", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60000);
  const anonymous = await request.get("/api/plans");
  expect(anonymous.status()).toBe(401);
  const badOrigin = await request.post("/api/auth/login", {
    headers: { origin: "https://evil.example" },
    data: { password: "test-password-123" },
  });
  expect(badOrigin.status()).toBe(403);
  await page.goto("/plans");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Dein Passwort").fill("wrong");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(page.getByText("Passwort ist nicht korrekt.")).toBeVisible();
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await expect(
    page.getByRole("heading", { name: /Zeit für dich/ }),
  ).toBeVisible();
  const cookie = (await context.cookies()).find(
    (c) => c.name === "fittrack_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  const protectedResponse = await page.request.get("/api/plans");
  expect(protectedResponse.headers()["cache-control"]).toContain("no-store");
  expect(protectedResponse.headers()["x-frame-options"]).toBe("DENY");
  const csrf = await page.request.post("/api/exercises", {
    headers: { origin: "https://evil.example" },
    data: { name: "Bad", muscle: "" },
  });
  expect(csrf.status()).toBe(403);
  if (await page.getByRole("link", { name: "Workout fortsetzen →" }).count())
    await page.getByRole("link", { name: "Workout fortsetzen →" }).click();
  else
    await page
      .getByRole("button", { name: "Training starten →" })
      .first()
      .click();
  await expect(
    page.getByRole("heading", { name: "Upper A", exact: true }),
  ).toBeVisible();
  const weight = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Gewicht in kg",
    exact: true,
  });
  const reps = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Wiederholungen",
    exact: true,
  });
  const rir = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, RIR",
    exact: true,
  });
  if (
    await page
      .getByRole("button", {
        name: "Bench Press, Satz 1 wieder öffnen",
        exact: true,
      })
      .count()
  ) {
    await page
      .getByRole("button", {
        name: "Bench Press, Satz 1 wieder öffnen",
        exact: true,
      })
      .click();
    await expect(page.locator(".save-status")).toHaveText(
      "Alle Änderungen gespeichert",
    );
  }
  await weight.fill("80");
  await reps.fill("10");
  await rir.fill("2");
  await page
    .getByRole("button", {
      name: "Bench Press, Satz 1 abschließen",
      exact: true,
    })
    .click();
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("fittrack-recovery")),
  ).toBeNull();
  await page.reload();
  await expect(reps).toHaveValue("10");
  await expect(
    page.getByRole("button", {
      name: "Bench Press, Satz 1 wieder öffnen",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await context.setOffline(true);
  await weight.fill("82,5");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("fittrack-recovery")))
    .not.toBeNull();
  await expect(page.locator(".save-status")).toHaveText(
    "Noch nicht synchronisiert",
  );
  await context.setOffline(false);
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
    { timeout: 15000 },
  );
  await page.reload();
  await expect(weight).toHaveValue("82.5");
  // Persist an unsent draft, reload the app shell, then recover and synchronize.
  await page.route("**/sets/**", (route) => route.abort());
  await weight.fill("85");
  await expect(page.locator(".save-status")).toHaveText(
    "Noch nicht synchronisiert",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(weight).toHaveValue("85");
  await page.unroute("**/sets/**");
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
    { timeout: 15000 },
  );
  expect(
    await page.evaluate(() => localStorage.getItem("fittrack-recovery")),
  ).toBeNull();
  // Commit on the server but lose the response; retry must remain idempotent.
  const workoutId = page.url().split("/").pop()!;
  const before = await (
    await page.request.get(`/api/workouts/${workoutId}`)
  ).json();
  await page.route(
    "**/sets/**",
    async (route) => {
      await route.fetch();
      await route.abort();
    },
    { times: 1 },
  );
  await weight.fill("82.5");
  await expect(page.locator(".save-status")).toHaveText(
    "Noch nicht synchronisiert",
  );
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
    { timeout: 15000 },
  );
  const after = await (
    await page.request.get(`/api/workouts/${workoutId}`)
  ).json();
  expect(after.exercises[0].sets[0].version).toBe(
    before.exercises[0].sets[0].version + 1,
  );
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/workout-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Weiter", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+30 Sek.", exact: true }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.locator(".timer-digits")).toHaveText("0:00");
  await weight.fill("80");
  for (const i of [2, 3]) {
    await page
      .getByRole("textbox", {
        name: `Bench Press, Satz ${i}, Wiederholungen`,
        exact: true,
      })
      .fill("10");
    await page
      .getByRole("textbox", {
        name: `Bench Press, Satz ${i}, RIR`,
        exact: true,
      })
      .fill("2");
    await page
      .getByRole("button", {
        name: `Bench Press, Satz ${i} abschließen`,
        exact: true,
      })
      .click();
  }
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
  );
  await page.getByLabel("Deine Notiz · optional").fill("Testtraining");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Workout beenden ✓" }).click();
  await expect(page).toHaveURL(/history\//);
  await expect(page.getByText("Testtraining", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Verlauf ↗" }).first().click();
  await expect(page.getByText("80 kg × 10 · RIR 2")).toHaveCount(3);
  await page.getByRole("link", { name: "Heute", exact: true }).click();
  await page
    .getByRole("button", { name: "Training starten →" })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Bench Press, Satz 1, Gewicht in kg",
      exact: true,
    }),
  ).toHaveValue("82.5");
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/plans");
  await expect(page).toHaveURL(/login/);
  const revoked = await request.get("/api/plans", {
    headers: { cookie: `fittrack_session=${cookie.value}` },
  });
  expect(revoked.status()).toBe(401);
});

test("create exercise, create and edit plan, accessible editor", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Dein Passwort").fill("test-password-123");
  await page.getByRole("button", { name: "Anmelden →" }).click();
  await page.getByRole("link", { name: "Pläne", exact: true }).click();
  await page.getByRole("link", { name: "+ Neuer Plan" }).click();
  await page.getByLabel("Planname").fill("Browser Testplan");
  await page.getByText("Neue Übung anlegen", { exact: true }).click();
  await page.getByLabel("Übungsname").fill("Test Rudern");
  await page.getByLabel("Muskelgruppe").fill("Rücken");
  await page
    .getByLabel("Kurzbeschreibung (optional)")
    .fill("Sitze aufrecht und ziehe die Griffe kontrolliert zum Oberkörper.");
  await page
    .getByRole("button", { name: "Übung anlegen", exact: true })
    .click();
  await page
    .getByLabel("Übung hinzufügen")
    .selectOption({ label: "Test Rudern" });
  await page.getByLabel("Start kg").fill("42.5");
  await page.getByRole("button", { name: "Plan speichern" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Testplan" }),
  ).toBeVisible();
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Browser Testplan" }) })
    .getByRole("link", { name: "Bearbeiten" })
    .click();
  await expect(page.getByLabel("Start kg")).toHaveValue("42.5");
  await page.locator(".assignment .exercise-guide summary").click();
  await expect(
    page.getByText(
      "Sitze aufrecht und ziehe die Griffe kontrolliert zum Oberkörper.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Planname").fill("Bearbeiteter Plan");
  await page.getByLabel("Start kg").fill("45");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole("button", { name: "Plan speichern" }).click();
  await expect(page).toHaveURL(/\/plans$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bearbeiteter Plan" }),
  ).toBeVisible();
});
