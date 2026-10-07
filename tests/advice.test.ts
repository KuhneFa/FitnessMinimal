import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../src/db";
import { saveMeal } from "../src/lib/nutrition";
import {
  adviceSnapshot,
  createAdviceThread,
  getAdviceThread,
  saveAdviceExchange,
  deleteAdviceThread,
  listAdviceThreads,
} from "../src/lib/advice";
import { adviceRequest } from "../src/lib/advice-prompt";
import { adviceAnswerSchema } from "../src/lib/advice-contract";
import { workouts } from "../src/db/schema";
const setup = () => ({
  id: randomUUID(),
  endDate: "2026-10-07",
  focus: "Regelmäßiger essen",
  includeTraining: false,
});
const meal = (date = "2026-10-07") => ({
  id: randomUUID(),
  date,
  category: "Mittagessen",
  description: "Kartoffeln mit Quark",
  calories: 500,
  caloriesLow: 450,
  caloriesHigh: 550,
  source: "estimated",
  assumptions: "300 g Kartoffeln, 200 g Quark",
  version: 0,
});
test("advice summaries preserve unknown days, bound excerpts and sum every logged meal", () => {
  const connection = openDatabase(":memory:");
  try {
    for (let i = 0; i < 9; i++)
      saveMeal(
        {
          ...meal(),
          description: "A".repeat(400) + "PRIVATE_TAIL",
          assumptions: "B".repeat(300),
        },
        connection,
      );
    saveMeal(
      {
        ...meal("2026-10-06"),
        source: "unknown",
        calories: null,
        caloriesLow: null,
        caloriesHigh: null,
        assumptions: "",
      },
      connection,
    );
    saveMeal(meal("2026-09-01"), connection);
    const snapshot = adviceSnapshot(setup(), connection);
    assert.equal(snapshot.from, "2026-10-01");
    assert.equal(snapshot.to, "2026-10-07");
    assert.equal(snapshot.days.length, 7);
    assert.equal(snapshot.days[0].loggedCalories, null);
    assert.equal(snapshot.days[5].unknownCalories, 1);
    assert.equal(snapshot.days[5].loggedCalories, null);
    assert.equal(snapshot.days[6].loggedCalories, 4500);
    assert.equal(snapshot.days[6].omittedDescriptions, 1);
    assert.equal(snapshot.days[6].entries.length, 8);
    assert.equal(snapshot.days[6].entries[0].description.length, 180);
    assert.equal(snapshot.days[6].entries[0].assumptions.length, 140);
    assert.equal(snapshot.training, null);
    assert.ok(!JSON.stringify(snapshot).includes("PRIVATE_TAIL"));
  } finally {
    connection.sqlite.close();
  }
});
test("optional training aggregate respects Berlin dates and excludes notes and unfinished sessions", () => {
  const connection = openDatabase(":memory:");
  try {
    for (const end of [
      "2026-09-30T22:10:00Z",
      "2026-10-07T21:59:00Z",
      "2026-10-07T22:01:00Z",
    ]) {
      connection.db
        .insert(workouts)
        .values({
          id: randomUUID(),
          dayName: "PRIVATE_DAY",
          planName: "PRIVATE_PLAN",
          note: "PRIVATE_NOTE",
          startedAt: Date.parse(end) - 1800000,
          finishedAt: Date.parse(end),
        })
        .run();
    }
    connection.db
      .insert(workouts)
      .values({
        id: randomUUID(),
        dayName: "ongoing",
        planName: "x",
        startedAt: Date.parse("2026-10-07T12:00:00Z"),
        finishedAt: null,
        active: 1,
      })
      .run();
    const summary = adviceSnapshot(
      { ...setup(), includeTraining: true },
      connection,
    );
    assert.deepEqual(summary.training, { completedWorkouts: 2, minutes: 60 });
    assert.ok(!JSON.stringify(summary).includes("PRIVATE"));
  } finally {
    connection.sqlite.close();
  }
});
test("saved advice freezes the summary, carries follow-up context, detects conflicts and deletes all copies", () => {
  const connection = openDatabase(":memory:");
  try {
    const input = setup();
    const firstMeal = saveMeal(meal(), connection);
    const thread = createAdviceThread(input, connection);
    assert.equal(createAdviceThread(input, connection).id, thread.id);
    assert.equal(listAdviceThreads(0, connection).length, 1);
    const { createdAt: _, ...editable } = firstMeal;
    void _;
    saveMeal({ ...editable, calories: 520 }, connection);
    assert.equal(
      getAdviceThread(thread.id, connection).snapshot.days[6].loggedCalories,
      500,
    );
    const reply = saveAdviceExchange(
      thread.id,
      0,
      "Wie plane ich regelmäßige Mahlzeiten?",
      "Plane eine feste Mittagspause.",
      connection,
    );
    const request = JSON.parse(
      adviceRequest(reply, "Was ist am Trainingstag sinnvoll?").input,
    );
    assert.equal(
      request.conversation[0].answer,
      "Plane eine feste Mittagspause.",
    );
    assert.equal(request.question, "Was ist am Trainingstag sinnvoll?");
    assert.equal(reply.version, 1);
    assert.throws(
      () =>
        saveAdviceExchange(
          thread.id,
          0,
          "Andere Frage",
          "Veraltete Antwort",
          connection,
        ),
      /inzwischen ergänzt/,
    );
    assert.throws(
      () => deleteAdviceThread(thread.id, 0, connection),
      /inzwischen/,
    );
    for (let version = 1; version < 6; version++)
      saveAdviceExchange(
        thread.id,
        version,
        "Noch eine Frage",
        "Noch eine Antwort",
        connection,
      );
    assert.throws(
      () =>
        saveAdviceExchange(
          thread.id,
          6,
          "Siebte Frage",
          "Zu viele Antworten",
          connection,
        ),
      /sechs Antworten/,
    );
    deleteAdviceThread(thread.id, 6, connection);
    assert.equal(
      connection.sqlite
        .prepare("SELECT count(*) AS n FROM advice_exchanges")
        .get() &&
        (
          connection.sqlite
            .prepare("SELECT count(*) AS n FROM advice_exchanges")
            .get() as { n: number }
        ).n,
      0,
    );
    assert.throws(
      () => getAdviceThread(thread.id, connection),
      /nicht gefunden/,
    );
    assert.equal(
      connection.sqlite.prepare("SELECT count(*) AS n FROM meals").get() &&
        (
          connection.sqlite
            .prepare("SELECT count(*) AS n FROM meals")
            .get() as { n: number }
        ).n,
      1,
    );
  } finally {
    connection.sqlite.close();
  }
});
test("advice responses reject missing/oversized output and the prompt treats logs as incomplete data", () => {
  assert.equal(adviceAnswerSchema.safeParse({ answer: "" }).success, false);
  assert.equal(
    adviceAnswerSchema.safeParse({ answer: "a".repeat(4001) }).success,
    false,
  );
  const connection = openDatabase(":memory:");
  try {
    const request = adviceRequest(
      createAdviceThread(setup(), connection),
      "Wie fange ich an?",
    );
    assert.match(
      request.instructions,
      /fehlende Tage\/Mahlzeiten sind unbekannt/,
    );
    assert.match(request.instructions, /keine Gewichtsreduktions-/);
    assert.deepEqual(
      request.parse(
        '```json\n{"answer":"Beginne mit einem Eintrag, wenn du möchtest."}\n```',
      ),
      { answer: "Beginne mit einem Eintrag, wenn du möchtest." },
    );
  } finally {
    connection.sqlite.close();
  }
});
