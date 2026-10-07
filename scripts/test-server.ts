import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { hashPassword } from "../src/lib/security";
const dir =
  process.env.FITMIN_E2E_DIRECTORY ||
  mkdtempSync(join(tmpdir(), "fittrack-e2e-"));
const env = {
  ...process.env,
  DATABASE_PATH: join(dir, "test.db"),
  PASSWORD_HASH: hashPassword("test-password-123"),
  APP_ORIGIN: "http://localhost:3100",
  // Browser tests mock AI responses; never use a developer's real API key.
  OPENAI_API_KEY: "e2e-paid-key-must-never-be-used",
};
const seed = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/seed.ts"],
  { env: { ...env, NODE_ENV: "development" }, stdio: "inherit" },
);
if (seed.status !== 0) process.exit(1);
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100"],
  { env: { ...env, NODE_ENV: "production" }, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code || 0);
});
