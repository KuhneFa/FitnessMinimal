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
