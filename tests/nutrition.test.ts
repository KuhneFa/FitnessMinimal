import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../src/db";
import { diary, saveMeal, deleteMeal } from "../src/lib/nutrition";
import {
  dateSchema,
  estimateSchema,
  mealTotals,
  parseNutritionResponse,
  moveDate,
} from "../src/lib/nutrition-contract";
import { mealRequest } from "../src/lib/nutrition-prompt";
import {
  requestStructuredWithChatGpt,
  PlanGenerationError,
} from "../src/lib/openai";
const estimate = {
  calories: 450,
  caloriesLow: 400,
  caloriesHigh: 500,
  assumptions: "60 g Haferflocken, 200 ml Milch, eine Banane.",
  clarification: "",
};
test("diary retains meals, separates dates and rejects concurrent edits/deletes", () => {
  const connection = openDatabase(":memory:");
  try {
    const value = {
      id: randomUUID(),
      date: "2026-10-07",
      category: "Frühstück",
      description: "Haferflocken mit Milch",
      ...estimate,
      source: "estimated",
      version: 0,
    };
    const { clarification: _, ...input } = value;
    void _;
    const first = saveMeal(input, connection);
    assert.equal(first.version, 1);
    assert.equal(
      diary("2026-10-07", connection)[0].assumptions,
      estimate.assumptions,
    );
    assert.equal(diary("2026-10-06", connection).length, 0);
    assert.throws(() => saveMeal(input, connection), /inzwischen geändert/);
    const updated = saveMeal(
      { ...input, version: 1, calories: 480 },
      connection,
    );
    assert.equal(updated.version, 2);
    assert.throws(() => deleteMeal(first.id, 1, connection), /inzwischen/);
    deleteMeal(first.id, 2, connection);
    assert.equal(diary("2026-10-07", connection).length, 0);
    assert.throws(
      () => saveMeal({ ...input, version: 2 }, connection),
      /gelöscht/,
    );
  } finally {
    connection.sqlite.close();
  }
});
test("dates and calorie totals distinguish unknown intake from actual zero", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(moveDate("2026-03-29", -1), "2026-03-28");
  const unknown = {
    calories: null,
    caloriesLow: null,
    caloriesHigh: null,
    source: "unknown" as const,
  };
  assert.equal(mealTotals([]).calories, null);
  assert.equal(mealTotals([unknown]).calories, null);
  const total = mealTotals([unknown, { ...estimate, source: "estimated" }]);
  assert.deepEqual(total, {
    count: 2,
    unknown: 1,
    estimated: true,
    calories: 450,
    low: 400,
    high: 500,
  });
});
test("nutrition imports validate ranges and uncertainty, reject incomplete and competing JSON", () => {
  assert.deepEqual(
    parseNutritionResponse(
      `Antwort:\n\`\`\`json\n${JSON.stringify(estimate)}\n\`\`\``,
      estimateSchema,
    ),
    estimate,
  );
  assert.throws(() =>
    parseNutritionResponse('{"calories":450', estimateSchema),
  );
  assert.throws(() =>
    parseNutritionResponse(
      `${JSON.stringify(estimate)} ${JSON.stringify(estimate)}`,
      estimateSchema,
    ),
  );
  for (const invalid of [
    { calories: -1 },
    { caloriesLow: 600 },
    { calories: 900000 },
    { assumptions: "" },
    { calories: null },
  ])
    assert.equal(
      estimateSchema.safeParse({ ...estimate, ...invalid }).success,
      false,
    );
  assert.equal(
    estimateSchema.safeParse({
      calories: null,
      caloriesLow: null,
      caloriesHigh: null,
      assumptions: "",
      clarification: "Welche Portion?",
    }).success,
    true,
  );
});
test("nutrition uses subscription transport, strict schema and public reply without saving", async () => {
  const account = {
    id: "test",
    clientId: "client",
    subject: "user",
    email: "test@example.com",
    accessToken: "subscription-token",
    refreshToken: "refresh",
    scopes: ["chatgpt.tokens.use.direct"],
    model: "account-model",
  };
  const spec = mealRequest("Haferflocken mit Milch und Banane");
  const transport: typeof fetch = async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.stream, true);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.input[0].content), {
      description: "Haferflocken mit Milch und Banane",
    });
    assert.equal(
      (init!.headers as Record<string, string>).Authorization,
      "Bearer subscription-token",
    );
    return new Response(
      `data: ${JSON.stringify({ type: "response.completed", response: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(estimate) }] }] } })}\n\n`,
    );
  };
  assert.deepEqual(
    (await requestStructuredWithChatGpt(spec, account, transport)).proposal,
    estimate,
  );
  await assert.rejects(
    requestStructuredWithChatGpt(
      spec,
      account,
      async () =>
        new Response(
          'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
        ),
    ),
    (e: unknown) =>
      e instanceof PlanGenerationError && e.reply.text === "partial",
  );
});
