import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import {
  deviceState,
  verifyDeviceEdgeCases,
  verifyBrowserRestart,
} from "./device-storage";
test("protected routes, login, mobile autosave, recovery and logout", async ({
  page: firstPage,
  context,
  request,
  browser,
}) => {
  test.setTimeout(120000);
  let page = firstPage;
  const anonymous = await request.get("/api/plans");
  expect(anonymous.status()).toBe(401);
  const badOrigin = await request.post("/api/auth/login", {
    headers: { origin: "https://evil.example" },
    data: { password: "test-password-123" },
  });
  expect(badOrigin.status()).toBe(403);

  // Native HTML login must work before hydration and with JavaScript disabled.
  const nativeContext = await browser.newContext({ javaScriptEnabled: false });
  try {
    const nativePage = await nativeContext.newPage();
    const submitted: { method: string; url: string }[] = [];
    nativePage.on("request", (req) => {
      if (new URL(req.url()).pathname === "/api/auth/login")
        submitted.push({ method: req.method(), url: req.url() });
    });
    await nativePage.goto(
      "http://localhost:3100/login?password=old-diagnostic-value",
    );
    await expect(nativePage).toHaveURL(
      "http://localhost:3100/login?error=unsafe-url",
    );
    await expect(nativePage.getByRole("alert")).toContainText("bereinigt");
    await expect(nativePage.locator("form")).toHaveAttribute("method", "post");
    await expect(nativePage.locator("form")).toHaveAttribute(
      "action",
      "/api/auth/login",
    );
    await nativePage.getByLabel("Dein Passwort").fill("wrong-native-password");
    await nativePage.getByRole("button", { name: "Anmelden →" }).click();
    await expect(nativePage).toHaveURL(
      "http://localhost:3100/login?error=invalid",
    );
    await expect(nativePage.getByRole("alert")).toHaveText(
      "Passwort ist nicht korrekt.",
    );
    await expect(nativePage.getByLabel("Dein Passwort")).toHaveValue("");
    await nativePage.getByLabel("Dein Passwort").fill("test-password-123");
    await nativePage.getByRole("button", { name: "Anmelden →" }).click();
    await expect(nativePage).toHaveURL("http://localhost:3100/");
    expect(submitted.length).toBe(2);
    expect(
      submitted.every(
        (req) => req.method === "POST" && !new URL(req.url).search,
      ),
    ).toBe(true);
    expect(
      (await nativeContext.cookies()).find((c) => c.name === "fittrack_session")
        ?.httpOnly,
    ).toBe(true);
  } finally {
    await nativeContext.close();
  }
  const deniedForm = await request.post("/api/auth/login", {
    headers: { origin: "http://192.168.2.101:3100" },
    form: { password: "test-password-123" },
    maxRedirects: 0,
  });
  expect(deniedForm.status()).toBe(303);
  expect(deniedForm.headers().location).toBe("/login?error=origin");
  expect(deniedForm.headers()["set-cookie"]).toBeUndefined();
  const getLogin = await request.get(
    "/api/auth/login?password=test-password-123",
  );
  expect(getLogin.status()).toBe(405);
  expect(getLogin.headers()["set-cookie"]).toBeUndefined();
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
  let weight = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Gewicht in kg",
    exact: true,
  });
  let reps = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Wiederholungen",
    exact: true,
  });
  let rir = page.getByRole("textbox", {
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
  expect((await deviceState(page)).drafts).toEqual([]);
  await page.reload();
  await expect(reps).toHaveValue("10");
  await expect(
    page.getByRole("button", {
      name: "Bench Press, Satz 1 wieder öffnen",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  const workoutUrl = page.url();
  const workoutId = workoutUrl.split("/").pop()!;
  await expect(page.getByTestId("offline-availability")).toContainText(
    "Offline-Start vorbereitet",
  );
  await context.setOffline(true);
  await weight.fill("82,5");
  await expect
    .poll(async () => (await deviceState(page)).drafts[0]?.draft.weight)
    .toBe("82,5");
  await expect(page.locator(".save-status")).toHaveText(
    "Noch nicht synchronisiert",
  );
  // Close the page entirely, then boot a fresh page with no network. Only the
  // public shell and IndexedDB may supply content; private HTML is never cached.
  await page.close();
  page = await context.newPage();
  await page.goto(workoutUrl);
  weight = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Gewicht in kg",
    exact: true,
  });
  reps = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, Wiederholungen",
    exact: true,
  });
  rir = page.getByRole("textbox", {
    name: "Bench Press, Satz 1, RIR",
    exact: true,
  });
  await expect(
    page.getByText("Gespeicherter Stand auf diesem Gerät", { exact: true }),
  ).toBeVisible();
  await expect(weight).toHaveValue("82,5");
  const cached = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      for (const req of await (await caches.open(name)).keys())
        paths.push(new URL(req.url).pathname);
    }
    return paths;
  });
  expect(cached).toContain("/offline");
  expect(
    cached.every(
      (path) =>
        path === "/offline" ||
        path.startsWith("/_next/static/") ||
        /^\/icon-\d+\.png$/.test(path),
    ),
  ).toBe(true);
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
  await verifyDeviceEdgeCases(page, context, workoutId);
  await verifyBrowserRestart(page, context, workoutId);
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
  expect((await deviceState(page)).snapshot).toBeNull();
  expect((await deviceState(page)).drafts).toEqual([]);
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
  const staleTab = await context.newPage();
  await staleTab.goto(page.url());
  await expect(
    staleTab.getByRole("textbox", {
      name: "Bench Press, Satz 1, Gewicht in kg",
      exact: true,
    }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await expect(staleTab).toHaveURL(/login/);
  expect((await deviceState(page)).revoked).toBe(true);
  expect((await deviceState(page)).snapshot).toBeNull();
  expect((await deviceState(page)).drafts).toEqual([]);
  await staleTab.goto("/offline");
  await expect(
    staleTab.getByText(/kein aktives Training verfügbar/),
  ).toBeVisible();
  await staleTab.close();
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
