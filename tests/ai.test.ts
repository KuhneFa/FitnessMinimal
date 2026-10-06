import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assistantInput, proposal } from "./fixtures/ai";
import { assistantInputSchema, proposalSchema } from "../src/lib/ai-contract";
import {
  generateWithChatGpt,
  parseCompletedProposal,
  PlanGenerationError,
  readProposalStream,
} from "../src/lib/openai";
import { parsePlanResponse } from "../src/lib/plan-response";
import {
  manualPlanPrompt,
  planFormatExample,
  planJsonSchema,
} from "../src/lib/plan-prompt";
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
const generateProposal = async (
  input: Parameters<typeof generateWithChatGpt>[0],
  library: Parameters<typeof generateWithChatGpt>[1],
  fetcher: typeof fetch,
) => (await generateWithChatGpt(input, library, account, fetcher)).proposal;
const sse = (value: unknown) =>
  new Response(
    `data: ${JSON.stringify({ type: "response.completed", response: value })}\n\n`,
  );
import { consumeAiBudget } from "../src/lib/ai-budget";
import { importAcceptedProposal } from "../src/lib/ai-import";
import { openDatabase, getDatabase } from "../src/db";
import { library, listPlans } from "../src/lib/plans";
process.env.OPENAI_API_KEY = "unit-test-key-never-real";
const envelope = (value: unknown) => ({
  status: "completed",
  output: [
    {
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(value) }],
    },
  ],
});
const mockResponse =
  (value: unknown, status = 200): typeof fetch =>
  async () =>
    status === 200 ? sse(value) : Response.json(value, { status });

test("structured proposal sends only explicit profile and library names, never stores response", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.input[0].content).request, assistantInput);
    assert.equal(body.stream, true);
    assert.equal(body.max_output_tokens, undefined);
    assert.equal(
      (init!.headers as Record<string, string>).Authorization,
      "Bearer subscription-token",
    );
    assert.match(body.instructions, /Körpergewicht/);
    assert.match(body.instructions, /weight=null/);
    assert.deepEqual(JSON.parse(body.input[0].content).availableExercises, [
      { name: "Bankdrücken", muscle: "Brust" },
    ]);
    return sse(envelope(proposal));
  };
  assert.deepEqual(
    await generateProposal(
      assistantInput,
      [{ name: "Bankdrücken", muscle: "Brust" }],
      fetcher,
    ),
    proposal,
  );
});
test("API key cannot replace missing subscription grant", async () => {
  let calls = 0;
  await assert.rejects(
    generateWithChatGpt(
      assistantInput,
      [],
      { ...account, scopes: [] },
      async () => {
        calls++;
        return sse(envelope(proposal));
      },
    ),
    /verbinden/,
  );
  assert.equal(calls, 0);
});
test("invalid or duplicated model exercises are rejected before any import", async () => {
  const invalid = structuredClone(proposal);
  invalid.days[0].exercises[0].sets = 500;
  await assert.rejects(
    generateProposal(assistantInput, [], mockResponse(envelope(invalid))),
    /Tag 1, Übung 1: Sätze/,
  );
  invalid.days[0].exercises = Array(2).fill(proposal.days[0].exercises[0]);
  assert.equal(proposalSchema.safeParse(invalid).success, false);
  const reversed = structuredClone(proposal);
  reversed.days[0].exercises[0].minReps = 20;
  assert.equal(proposalSchema.safeParse(reversed).success, false);
});
test("incomplete outputs and refusals do not become plans", async () => {
  await assert.rejects(
    generateProposal(
      assistantInput,
      [],
      mockResponse({ status: "incomplete", output: [] }),
    ),
    /unvollständig/,
  );
  await assert.rejects(
    generateProposal(
      assistantInput,
      [],
      mockResponse({
        status: "completed",
        output: [{ type: "message", content: [{ type: "refusal" }] }],
      }),
    ),
    /kein Trainingsplan/,
  );
  await assert.rejects(
    generateProposal(
      assistantInput,
      [],
      mockResponse({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "not json" }],
          },
        ],
      }),
    ),
    /Originalantwort/,
  );
});
test("provider errors are redacted and timeouts are actionable", async () => {
  for (const status of [401, 403, 429, 500])
    await assert.rejects(
      generateProposal(
        assistantInput,
        [],
        mockResponse(
          { error: { message: "secret key + sensitive profile" } },
          status,
        ),
      ),
      (e) =>
        e instanceof Error &&
        !e.message.includes("secret") &&
        !e.message.includes("sensitive"),
    );
  await assert.rejects(
    generateProposal(assistantInput, [], async () => {
      throw new DOMException("private data", "TimeoutError");
    }),
    /dauert zu lange/,
  );
});
test("optional profile values may be absent but implausible values and long prompts are rejected", () => {
  assert.equal(
    assistantInputSchema.safeParse({
      ...assistantInput,
      profile: {
        age: null,
        heightCm: null,
        weightKg: null,
        focus: "",
        experience: "unspecified",
        daysPerWeek: null,
      },
    }).success,
    true,
  );
  for (const patch of [
    { age: -1 },
    { heightCm: 900 },
    { weightKg: 0 },
    { daysPerWeek: 8 },
  ])
    assert.equal(
      assistantInputSchema.safeParse({
        ...assistantInput,
        profile: { ...assistantInput.profile, ...patch },
      }).success,
      false,
    );
  assert.equal(
    assistantInputSchema.safeParse({
      ...assistantInput,
      wishes: "x".repeat(6001),
    }).success,
    false,
  );
});
test("SSE requires terminal completion, supports chunk boundaries and stops on late limits", async () => {
  const data = `data: ${JSON.stringify({ type: "response.completed", response: envelope(proposal) })}\r\n\r\n`;
  const bytes = new TextEncoder().encode(data);
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7)
        controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });
  const result = await readProposalStream(new Response(stream));
  assert.deepEqual(result.proposal, proposal);
  assert.equal(result.reply.text, JSON.stringify(proposal));
  await assert.rejects(
    readProposalStream(
      new Response(
        'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
      ),
    ),
    /unterbrochen/,
  );
  await assert.rejects(
    readProposalStream(
      new Response(
        'data: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}}\n\n',
      ),
    ),
    /Nutzungslimit/,
  );
  await assert.rejects(
    readProposalStream(
      new Response('data: {"type":"response.incomplete"}\n\n'),
    ),
    /unvollständig/,
  );
});
test("manual ChatGPT prompt includes compact format, voluntary context and library without external call", () => {
  const prompt = manualPlanPrompt(assistantInput, [
    { name: "Bankdrücken", muscle: "Brust" },
  ]);
  assert.match(prompt, /JSON-Objekt/);
  assert.match(prompt, /Bankdrücken/);
  assert.match(prompt, /Alle Schlüssel erforderlich/);
  assert.ok(
    prompt.length < 3500,
    "Keep the manual prompt compact for this fixture",
  );
  assert.ok(
    !prompt.includes("additionalProperties"),
    "Do not duplicate the full schema in the copy prompt",
  );
});

test("response parsing accepts harmless number formatting but never guesses or clamps values", () => {
  const value = JSON.parse(JSON.stringify(proposal));
  value.days[0].exercises[0].sets = "3";
  value.days[0].exercises[0].increment = "2,5";
  assert.deepEqual(
    parsePlanResponse("```json\n" + JSON.stringify(value) + "\n```"),
    proposal,
  );
  for (const weight of ["80 kg", "", "null", -10, 1001]) {
    value.days[0].exercises[0].weight = weight;
    assert.throws(
      () => parsePlanResponse(JSON.stringify(value)),
      /Tag 1, Übung 1: Trainingsgewicht/,
    );
  }
  delete value.days[0].exercises[0].weight;
  assert.throws(
    () => parsePlanResponse(JSON.stringify(value)),
    /Trainingsgewicht/,
  );
});

test("response validation identifies duplicates, reversed ranges and missing fields without exposing values", () => {
  const value = structuredClone(proposal);
  value.days[0].exercises[1] = structuredClone(value.days[0].exercises[0]);
  assert.throws(
    () => parsePlanResponse(JSON.stringify(value)),
    /Tag 1, Übung 2: Die Übung kommt/,
  );
  value.days[0].exercises[1] = proposal.days[0].exercises[1];
  value.days[0].exercises[0].minReps = 20;
  assert.throws(
    () => parsePlanResponse(JSON.stringify(value)),
    /Minimale Wiederholungen dürfen/,
  );
  assert.throws(
    () => parsePlanResponse('{"name":"private input"}'),
    (error) =>
      error instanceof Error &&
      error.message.includes("Zusammenfassung") &&
      !error.message.includes("private input"),
  );
  assert.throws(() => parsePlanResponse("x".repeat(65537)), /zu groß/);
  assert.throws(
    () => parsePlanResponse(JSON.stringify({ ...proposal, notes: [""] })),
    /Hinweis 1: Hinweise/,
  );
});

test("first-request errors distinguish app quota, temporary availability, eligibility and unknown 429 without retry", async () => {
  const cases = [
    ["subscription_sharing_usage_limit_exceeded", 429, /Limit für diese App/],
    ["subscription_sharing_usage_unavailable", 503, /gerade nicht prüfen/],
    ["subscription_sharing_user_not_eligible", 403, /nicht frei/],
    ["subscription_sharing_unsupported_capability", 400, /angefragte Funktion/],
    ["rate_limit_exceeded", 429, /vorübergehendes Anfragelimit/],
    ["insufficient_quota", 429, /kein verbrauchtes Plus-Abo/],
    ["unknown_private_code", 429, /ist unbekannt/],
  ] as const;
  for (const [code, status, expected] of cases) {
    let calls = 0;
    await assert.rejects(
      generateProposal(assistantInput, [], async () => {
        calls++;
        return Response.json(
          { error: { code, message: "private input + credential" } },
          { status },
        );
      }),
      (error) =>
        error instanceof Error &&
        expected.test(error.message) &&
        !error.message.includes("private") &&
        !error.message.includes("credential"),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    readProposalStream(
      new Response(
        'data: {"type":"error","code":"subscription_sharing_usage_unavailable"}\n\n',
      ),
    ),
    /gerade nicht prüfen/,
  );
});
test("AI budgets share sessions, survive requests and enforce both short and daily limits", () => {
  const { sqlite } = openDatabase(":memory:");
  for (let window = 0; window < 6; window++)
    for (let i = 0; i < 5; i++)
      consumeAiBudget(sqlite, "plan", 1000 + window * 16 * 60000);
  assert.throws(
    () => consumeAiBudget(sqlite, "plan", 1000 + 6 * 16 * 60000),
    /KI-Limit/,
  );
  consumeAiBudget(sqlite, "audio", 1000);
  consumeAiBudget(sqlite, "plan", 1000 + 25 * 3600000);
  assert.equal(
    (
      sqlite.prepare("SELECT count(*) AS n FROM login_attempts").get() as {
        n: number;
      }
    ).n,
    4,
  );
  sqlite.close();
});
test("only accepted exercises are imported; matching library entries are reused; retries do not duplicate", () => {
  const dir = mkdtempSync(join(tmpdir(), "fittrack-ai-"));
  process.env.DATABASE_PATH = join(dir, "test.db");
  const { sqlite } = getDatabase();
  const id = randomUUID();
  sqlite
    .prepare("INSERT INTO exercises(id,name,muscle) VALUES (?,?,?)")
    .run(id, "Bankdrücken", "Brust");
  const accepted = {
    name: proposal.name,
    days: [{ name: "Tag A", exercises: [proposal.days[0].exercises[0]] }],
  };
  const first = importAcceptedProposal(accepted);
  assert.equal(first.plan.days[0].exercises[0].exerciseId, id);
  assert.equal(library().length, 1);
  assert.equal(listPlans().length, 0);
  const all = { name: proposal.name, days: proposal.days };
  const imported = importAcceptedProposal(all);
  assert.equal(imported.plan.days[0].exercises[1].weight, 0);
  assert.equal(library().length, 2);
  importAcceptedProposal(all);
  assert.equal(library().length, 2);
  assert.throws(() => importAcceptedProposal({ name: "bad", days: [] }));
  assert.equal(library().length, 2);
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

test("JSON within prose/code fences is readable, but competing or truncated objects are never guessed", () => {
  const value = structuredClone(proposal);
  value.summary = 'Ein Plan mit {Klammern} und "Zitat".';
  const text = JSON.stringify(value);
  assert.deepEqual(
    parsePlanResponse(
      `Hier ist dein Plan:\n\n\`\`\`json\n${text}\n\`\`\`\nViel Erfolg!`,
    ),
    value,
  );
  for (const invalid of [
    text.slice(0, -1),
    `${text}\n${text}`,
    `${text}\n{"name":`,
    "Hier sind drei gute Übungen: Bankdrücken, Kniebeugen, Rudern.",
  ])
    assert.throws(() => parsePlanResponse(invalid), /Originalantwort/);
});

test("AI rules and schema reject 900 reps and excessive rest; the format example is a valid small prescription", () => {
  assert.deepEqual(
    parsePlanResponse(JSON.stringify(planFormatExample)),
    planFormatExample,
  );
  const schema = planJsonSchema() as unknown as {
    properties: {
      days: {
        items: {
          properties: {
            exercises: {
              items: { properties: Record<string, { maximum: number }> };
            };
          };
        };
      };
    };
  };
  const properties =
    schema.properties.days.items.properties.exercises.items.properties;
  assert.equal(properties.maxReps.maximum, 30);
  assert.equal(properties.rest.maximum, 300);
  for (const [key, invalid] of [
    ["maxReps", 900],
    ["minReps", 900],
    ["rest", 900],
    ["sets", 10],
    ["targetRir", 10],
  ] as const) {
    const value = structuredClone(proposal);
    value.days[0].exercises[0][key] = invalid;
    assert.throws(
      () => parsePlanResponse(JSON.stringify(value)),
      /ungültige Werte/,
    );
  }
});

const eventStream = (events: unknown[]) =>
  new Response(
    events.map((event) => `data: ${JSON.stringify(event)}`).join("\r\n\r\n"),
  );

test("streamed text is retained if completed output is empty, without duplicating delta/done/item text", async () => {
  const text = JSON.stringify(proposal);
  const events = [
    {
      type: "response.output_text.delta",
      output_index: 1,
      content_index: 0,
      delta: text.slice(0, 40),
    },
    {
      type: "response.output_text.delta",
      output_index: 1,
      content_index: 0,
      delta: text.slice(40),
    },
    {
      type: "response.output_text.done",
      output_index: 1,
      content_index: 0,
      text,
    },
    {
      type: "response.output_item.done",
      output_index: 1,
      item: envelope(proposal).output[0],
    },
    {
      type: "response.completed",
      response: { status: "completed", output: [] },
    },
  ];
  const result = await readProposalStream(eventStream(events));
  assert.deepEqual(result.proposal, proposal);
  assert.equal(result.reply.text, text);
  assert.equal(result.reply.status, "completed");
  assert.equal(result.reply.truncated, false);
  // Delta-only fallback still requires explicit terminal completion.
  assert.equal(
    (await readProposalStream(eventStream([events[0], events[1], events[4]])))
      .reply.text,
    text,
  );
});

test("invalid, refused and empty outputs preserve public replies, not reasoning or provider credentials", () => {
  const raw = 'Hier ist dein Trainingsplan.\n<img src=x onerror="alert(1)">';
  const response = {
    status: "completed",
    output: [
      {
        type: "reasoning",
        content: [{ type: "output_text", text: "private reasoning" }],
      },
      { type: "message", content: [{ type: "output_text", text: raw }] },
    ],
    accessToken: "credential",
  };
  assert.throws(
    () => parseCompletedProposal(response),
    (error) =>
      error instanceof PlanGenerationError &&
      error.reply.text === raw &&
      !JSON.stringify(error.reply).includes("private reasoning") &&
      !JSON.stringify(error.reply).includes("credential"),
  );
  assert.throws(
    () => parseCompletedProposal({ status: "completed", output: [] }),
    (error) =>
      error instanceof PlanGenerationError &&
      /keinen Antworttext/.test(error.message) &&
      error.reply.text === "",
  );
  assert.throws(
    () =>
      parseCompletedProposal({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "refusal",
                refusal: "Diese Anfrage kann ich nicht beantworten.",
              },
            ],
          },
        ],
      }),
    (error) =>
      error instanceof PlanGenerationError &&
      error.reply.status === "refused" &&
      error.reply.text === "Diese Anfrage kann ich nicht beantworten.",
  );
});

test("incomplete or failed streams keep inspectable text but never return a plan even when its JSON is valid", async () => {
  const text = JSON.stringify(proposal);
  const delta = { type: "response.output_text.delta", delta: text };
  for (const terminal of [
    undefined,
    {
      type: "response.incomplete",
      response: { status: "incomplete", output: [] },
    },
    {
      type: "response.failed",
      response: {
        error: {
          code: "subscription_sharing_usage_limit_exceeded",
          message: "private credential",
        },
      },
    },
  ]) {
    await assert.rejects(
      readProposalStream(eventStream(terminal ? [delta, terminal] : [delta])),
      (error) =>
        error instanceof PlanGenerationError &&
        error.reply.text === text &&
        error.reply.status !== "completed" &&
        !JSON.stringify(error.reply).includes("credential"),
    );
  }
});

test("oversized public replies are visibly truncated and rejected, never imported from their preview", () => {
  const output = {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: "ä".repeat(40000) }],
      },
    ],
  };
  assert.throws(
    () => parseCompletedProposal(output),
    (error) =>
      error instanceof PlanGenerationError &&
      error.reply.truncated &&
      new TextEncoder().encode(error.reply.text).length <= 65536 &&
      /zu groß/.test(error.message),
  );
});
