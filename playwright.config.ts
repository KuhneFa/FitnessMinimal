import { defineConfig, devices } from "@playwright/test";
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
