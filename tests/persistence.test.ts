import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { databasePath } from "../src/db";
import { scenarios } from "./helpers/scenarios";

test("durability through abrupt restart and persistent-volume enforcement", () =>
  scenarios([
    {
      name: "committed SQLite WAL survives abrupt process termination",
      run: () => {
        const dir = mkdtempSync(join(tmpdir(), "fittrack-restart-"));
        const env = { ...process.env, DATABASE_PATH: join(dir, "restart.db") };
        const write = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "-e",
            'const {getDatabase}=require("./src/db/index.ts"); getDatabase().sqlite.prepare("INSERT INTO settings(key,value) VALUES (?,?)").run("restart-proof","80x10-RIR2"); process.kill(process.pid,"SIGKILL");',
          ],
          { env, encoding: "utf8" },
        );
        assert.equal(write.signal, "SIGKILL", write.stderr);
        const read = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "-e",
            'const {getDatabase}=require("./src/db/index.ts"); console.log(getDatabase().sqlite.prepare("SELECT value FROM settings WHERE key=?").get("restart-proof").value);',
          ],
          { env, encoding: "utf8" },
        );
        assert.equal(read.status, 0, read.stderr);
        assert.equal(read.stdout.trim(), "80x10-RIR2");
        rmSync(dir, { recursive: true, force: true });
      },
    },
    {
      name: "Railway refuses ephemeral database paths and missing volume",
      run: () => {
        const original = { ...process.env };
        try {
          process.env.RAILWAY_ENVIRONMENT_ID = "test";
          delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
          assert.throws(() => databasePath(), /persistent volume/);
          process.env.RAILWAY_VOLUME_MOUNT_PATH = "/data";
          process.env.DATABASE_PATH = "/tmp/ephemeral.db";
          assert.throws(() => databasePath(), /inside the Railway volume/);
        } finally {
          for (const key of [
            "RAILWAY_ENVIRONMENT_ID",
            "RAILWAY_VOLUME_MOUNT_PATH",
            "DATABASE_PATH",
          ]) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
          }
        }
      },
    },
  ]));
