import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planSchema, savePlan, listPlans } from "../src/lib/plans";
import { getDatabase } from "../src/db";
test("plan editing replaces assignments atomically; invalid foreign keys roll back", () => {
  const dir = mkdtempSync(join(tmpdir(), "fittrack-plans-"));
  process.env.DATABASE_PATH = join(dir, "test.db");
  const { sqlite } = getDatabase();
  const exerciseId = randomUUID();
  sqlite
    .prepare("INSERT INTO exercises(id,name,muscle) VALUES (?,?,?)")
    .run(exerciseId, "Bench Press", "Brust");
  const item = {
    exerciseId,
    sets: 3,
    minReps: 8,
    maxReps: 10,
    targetRir: 2,
    weight: 80,
    increment: 2.5,
    rest: 120,
  };
  const input = {
    name: "Test",
    days: [{ name: "Upper A", exercises: [item] }],
  };
  const id = savePlan(input);
  assert.equal(listPlans()[0].days[0].exercises[0].weight, 80);
  savePlan({ ...input, name: "Neu" }, id);
  assert.equal(listPlans()[0].name, "Neu");
  assert.throws(() =>
    savePlan(
      {
        ...input,
        days: [
          { name: "Bad", exercises: [{ ...item, exerciseId: randomUUID() }] },
        ],
      },
      id,
    ),
  );
  assert.equal(listPlans()[0].name, "Neu");
  assert.equal(
    planSchema.safeParse({
      ...input,
      days: [
        { name: "Invalid", exercises: [{ ...item, minReps: 12, maxReps: 8 }] },
      ],
    }).success,
    false,
  );
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
