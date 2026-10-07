import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Inherited by the isolated server and workers; never points at the user database.
process.env.FITMIN_E2E_DIRECTORY ??= mkdtempSync(join(tmpdir(), "fitmin-e2e-"));
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
      },
    },
    ...(process.env.TEST_WEBKIT
      ? [{ name: "webkit-iphone", use: { ...devices["iPhone 13"] } }]
      : []),
  ],
  webServer: {
    command: "node --import tsx scripts/test-server.ts",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
