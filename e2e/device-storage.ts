import { expect, type Page, type BrowserContext } from "@playwright/test";
import type { Workout } from "../src/lib/workouts";
import type { StoredDraft } from "../src/lib/device-storage";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function deviceState(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        epoch: string;
        revoked: boolean;
        snapshot: Workout | null;
        drafts: StoredDraft[];
      }>((resolve, reject) => {
        const request = indexedDB.open("fitmin-device", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("state", "readonly");
          const get = tx.objectStore("state").get("device");
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

// Scenarios belong to the existing workout contract, keeping the agreed total
// at 30 tests while exercising real IndexedDB transactions and multiple tabs.
export async function verifyDeviceEdgeCases(
  page: Page,
  context: BrowserContext,
  workoutId: string,
) {
  const url = page.url();
  const field = { name: "Bench Press, Satz 1, Gewicht in kg", exact: true };
  const state = await deviceState(page);
  const row = state.snapshot!.exercises[0].sets[0];
  await page.evaluate(
    ({ workoutId, row }) =>
      localStorage.setItem(
        "fittrack-recovery",
        JSON.stringify({
          workoutId,
          sets: {
            [row.id]: {
              weight: "83",
              reps: String(row.reps),
              rir: String(row.rir),
              completed: row.completed,
              version: row.version,
              mutationId: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          },
        }),
      ),
    { workoutId, row },
  );

  // Abort exactly the migration's write. Legacy data must remain intact, and
  // there must be no half-imported queue after a failed commit.
  const quotaPage = await context.newPage();
  await quotaPage.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        value?.drafts?.some(
          (entry: { draft: { weight: string } }) => entry.draft.weight === "83",
        )
      )
        throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return original.call(this, value, key!);
    };
  });
  await quotaPage.goto(url);
  await expect(
    quotaPage.getByText(/Ältere lokale Eingaben konnten nicht übernommen/),
  ).toBeVisible();
  expect(
    await quotaPage.evaluate(() => localStorage.getItem("fittrack-recovery")),
  ).not.toBeNull();
  expect((await deviceState(quotaPage)).drafts).toEqual([]);
  await quotaPage.close();

  await page.route("**/sets/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("textbox", field)).toHaveValue("83");
  expect(
    await page.evaluate(() => localStorage.getItem("fittrack-recovery")),
  ).toBeNull();
  await expect
    .poll(async () => (await deviceState(page)).drafts.length)
    .toBe(1);
  await page.unroute("**/sets/**");
  await expect(page.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
    { timeout: 15000 },
  );

  await page.evaluate(() =>
    localStorage.setItem("fittrack-recovery", "invalid legacy JSON"),
  );
  await page.reload();
  await expect(
    page.getByText(/Ältere lokale Eingaben konnten nicht übernommen/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("fittrack-recovery")),
  ).toBe("invalid legacy JSON");
  await page.evaluate(() => localStorage.removeItem("fittrack-recovery"));
  await page.reload();

  // Two editors retain both values; explicit discard invalidates the old
  // editor so it cannot silently put its discarded value back into the queue.
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByRole("textbox", field)).toBeEnabled();
  await page.route("**/sets/**", (route) => route.abort());
  await other.route("**/sets/**", (route) => route.abort());
  await page.getByRole("textbox", field).fill("84");
  await expect
    .poll(async () => (await deviceState(page)).drafts.length)
    .toBe(1);
  await other.getByRole("textbox", field).fill("85");
  await expect
    .poll(async () => (await deviceState(page)).drafts.length)
    .toBe(2);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "unterschiedliche Eingaben",
  );
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "unterschiedliche Eingaben",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "84 kg",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "85 kg",
  );
  page.once("dialog", (dialog) => dialog.accept());
  // Leave enough time for any deliberately failed HTTP request to settle.
  await expect(
    page.getByRole("button", { name: "Serverstand laden" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Serverstand laden" }).click();
  await expect(page.getByRole("textbox", field)).toHaveValue("83");
  await expect(other).toHaveURL("http://localhost:3100/");
  expect((await deviceState(page)).drafts).toEqual([]);
  await other.close();
  await page.unroute("**/sets/**");

  // Browser storage being denied must remain visible even when an online
  // write succeeds. No local-success claim or disabled online workflow.
  const denied = await context.newPage();
  await denied.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException("Synthetic denied storage", "SecurityError");
    };
  });
  await denied.goto(url);
  await expect(
    denied.getByText(/Lokale Wiederherstellung ist nicht verfügbar/),
  ).toBeVisible();
  await denied.getByRole("textbox", field).fill("86");
  await expect(denied.locator(".save-status")).toHaveText(
    "Alle Änderungen gespeichert",
  );
  await expect(
    denied.getByText(/Lokale Wiederherstellung ist nicht verfügbar/),
  ).toBeVisible();
  await denied.close();
  await page.reload();
  await expect(page.getByRole("textbox", field)).toHaveValue("86");
}

export async function verifyBrowserRestart(
  page: Page,
  context: BrowserContext,
  workoutId: string,
) {
  const profile = await mkdtemp(join(tmpdir(), "fitmin-browser-restart-"));
  const type = context.browser()!.browserType();
  let persistent: BrowserContext | undefined;
  const url = `http://localhost:3100/workout/${workoutId}`;
  const field = { name: "Bench Press, Satz 1, Gewicht in kg", exact: true };
  const before = await (
    await page.request.get(`/api/workouts/${workoutId}`)
  ).json();
  try {
    persistent = await type.launchPersistentContext(profile, {
      headless: true,
    });
    await persistent.addCookies(await context.cookies());
    let tab = await persistent.newPage();
    await tab.goto(url);
    await expect(tab.getByTestId("offline-availability")).toContainText(
      "Offline-Start vorbereitet",
    );
    await expect(tab.getByRole("textbox", field)).toBeEnabled();
    await persistent.setOffline(true);
    await tab.getByRole("textbox", field).fill("87");
    await expect
      .poll(async () => (await deviceState(tab)).drafts[0]?.draft.weight)
      .toBe("87");
    await persistent.close();

    // A new browser process uses the same on-disk profile, with networking
    // disabled before any navigation. No state is supplied by the old process.
    persistent = await type.launchPersistentContext(profile, {
      headless: true,
      offline: true,
    });
    tab = await persistent.newPage();
    await tab.goto(url);
    await expect(
      tab.getByText("Gespeicherter Stand auf diesem Gerät", { exact: true }),
    ).toBeVisible();
    await expect(tab.getByRole("textbox", field)).toHaveValue("87");
    await persistent.setOffline(false);
    await expect(tab.locator(".save-status")).toHaveText(
      "Alle Änderungen gespeichert",
      { timeout: 15000 },
    );
    const after = await (
      await page.request.get(`/api/workouts/${workoutId}`)
    ).json();
    expect(after.exercises[0].sets[0].weight).toBe(87);
    expect(after.exercises[0].sets[0].version).toBe(
      before.exercises[0].sets[0].version + 1,
    );
  } finally {
    await persistent?.close();
    await rm(profile, { recursive: true, force: true });
  }
  await page.reload();
  await expect(page.getByRole("textbox", field)).toHaveValue("87");
}
