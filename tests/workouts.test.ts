import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDatabase, openDatabase } from "../src/db";
import { savePlan, listPlans } from "../src/lib/plans";
import {
  startWorkout,
  getWorkout,
  saveSet,
  finishWorkout,
  historyPage,
  exerciseHistory,
} from "../src/lib/workouts";
test("workout snapshots, autosave, retry, conflicts and restart persistence", () => {
  const dir = mkdtempSync(join(tmpdir(), "fittrack-workout-"));
  const file = join(dir, "test.db");
  process.env.DATABASE_PATH = file;
  const { sqlite } = getDatabase();
  const exerciseId = randomUUID();
  sqlite
    .prepare("INSERT INTO exercises(id,name,muscle) VALUES (?,?,?)")
    .run(exerciseId, "Bench", "Brust");
  const input = {
    name: "Upper / Lower",
    days: [
      {
        name: "Upper A",
        exercises: [
          {
            exerciseId,
            sets: 3,
            minReps: 8,
            maxReps: 10,
            targetRir: 2,
            weight: 80,
            increment: 2.5,
            rest: 120,
          },
        ],
      },
    ],
  };
  const planId = savePlan(input);
  const dayId = listPlans()[0].days[0].id;
  const id = startWorkout(dayId);
  assert.equal(startWorkout(dayId), id);
  let w = getWorkout(id);
  assert.equal(w.exercises[0].sets.length, 3);
  savePlan({ ...input, name: "Changed" }, planId);
  assert.equal(getWorkout(id).planName, "Upper / Lower");
  const set = w.exercises[0].sets[0];
  const value = {
    weight: 80,
    reps: 10,
    rir: 2,
    completed: true,
    version: 0,
    mutationId: randomUUID(),
  };
  const saved = saveSet(id, set.id, value);
  assert.equal(saved.version, 1);
  assert.equal(saveSet(id, set.id, value).version, 1);
  assert.throws(
    () => saveSet(id, set.id, { ...value, mutationId: randomUUID() }),
    /anderen Fenster/,
  );
  assert.throws(() => saveSet(id, randomUUID(), value), /nicht gefunden/);
  assert.throws(() => saveSet(id, set.id, { ...value, weight: -1 }));
  w = getWorkout(id);
  assert.equal(w.exercises[0].sets[0].completed, true);
  const beforeFinish = getWorkout(id);
  const versions = Object.fromEntries(
    beforeFinish.exercises.flatMap((e) => e.sets).map((s) => [s.id, s.version]),
  );
  const finish = {
    fatigue: 3,
    performance: 4,
    note: "Testnotiz",
    allowIncomplete: false,
    versions,
  };
  assert.throws(
    () => finishWorkout(id, { ...finish, versions: {} }),
    /zwischenzeitlich/,
  );
  assert.throws(() => finishWorkout(id, finish), /offene Sätze/);
  for (const s of beforeFinish.exercises[0].sets.filter((s) => !s.completed))
    saveSet(id, s.id, {
      weight: 80,
      reps: 10,
      rir: 2,
      completed: true,
      version: s.version,
      mutationId: randomUUID(),
    });
  const complete = getWorkout(id);
  finish.versions = Object.fromEntries(
    complete.exercises.flatMap((e) => e.sets).map((s) => [s.id, s.version]),
  );
  finishWorkout(id, finish);
  assert.equal(historyPage()[0].note, "Testnotiz");
  assert.equal(exerciseHistory(exerciseId)[0].sets.length, 3);
  assert.equal(finishWorkout(id, finish).active, null);
  assert.throws(
    () => saveSet(id, set.id, { ...value, version: 1 }),
    /abgeschlossen/,
  );
  const nextId = startWorkout(listPlans()[0].days[0].id);
  assert.equal(getWorkout(nextId).exercises[0].sets[0].weight, 82.5);
  const reopened = openDatabase(file);
  assert.equal(
    (
      reopened.sqlite
        .prepare("SELECT reps FROM workout_sets WHERE id=?")
        .get(set.id) as { reps: number }
    ).reps,
    10,
  );
  reopened.sqlite.close();
  sqlite.close();
  const restarted = openDatabase(file);
  assert.equal(
    (
      restarted.sqlite
        .prepare("SELECT weight FROM workout_sets WHERE id=?")
        .get(set.id) as { weight: number }
    ).weight,
    80,
  );
  restarted.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
