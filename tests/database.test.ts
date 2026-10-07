import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/db";
test("migrations are repeatable and SQLite enforces foreign keys", () => {
  const { sqlite } = openDatabase(":memory:");
  assert.equal(sqlite.pragma("foreign_keys", { simple: true }), 1);
  assert.ok(
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE name = 'settings'")
      .get(),
  );
  sqlite.close();
});

test("exercise guidance migration preserves older library entries and initializes empty guidance", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { readFileSync } = await import("node:fs");
  const sqlite = new Database(":memory:");
  sqlite.exec(
    "CREATE TABLE exercises (id text PRIMARY KEY, name text NOT NULL, muscle text NOT NULL)",
  );
  sqlite
    .prepare("INSERT INTO exercises VALUES (?, ?, ?)")
    .run("existing", "Bankdrücken", "Brust");
  sqlite.exec(readFileSync("drizzle/0006_bored_caretaker.sql", "utf8"));
  assert.deepEqual(sqlite.prepare("SELECT * FROM exercises").get(), {
    id: "existing",
    name: "Bankdrücken",
    muscle: "Brust",
    instructions: "",
  });
  sqlite.close();
});
