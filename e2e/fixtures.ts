import { test as base, expect } from "@playwright/test";
import Database from "better-sqlite3";
import { join, basename } from "node:path";
// Each test starts with a fresh login budget in the disposable database. The
// production limiter is unchanged and has its own persistence/limit unit tests.
export const test = base.extend<{ isolatedLoginBudget: void }>({
  isolatedLoginBudget: [
    async ({}, use) => {
      const dir = process.env.FITMIN_E2E_DIRECTORY;
      if (!dir || !basename(dir).startsWith("fitmin-e2e-"))
        throw new Error("Isolated E2E database required");
      const sqlite = new Database(join(dir, "test.db"), {
        fileMustExist: true,
      });
      try {
        sqlite.prepare("DELETE FROM login_attempts WHERE key = 'global'").run();
      } finally {
        sqlite.close();
      }
      await use();
    },
    { auto: true },
  ],
});
export { expect };
