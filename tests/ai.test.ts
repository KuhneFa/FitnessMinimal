import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assistantInput, proposal } from "./fixtures/ai";
import {
  assistantInputSchema,
  proposalSchema,
  MAX_AUDIO_BYTES,
} from "../src/lib/ai-contract";
import {
  generateProposal,
  readAudio,
  transcribeAudio,
  requireOpenAiKey,
} from "../src/lib/openai";
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
    Response.json(value, { status });

test("structured proposal sends only explicit profile and library names, never stores response", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(JSON.parse(body.input).request, assistantInput);
    assert.match(body.instructions, /Körpergewicht/);
    assert.match(body.instructions, /weight=null/);
    assert.deepEqual(JSON.parse(body.input).availableExercises, [
      { name: "Bankdrücken", muscle: "Brust" },
    ]);
    return Response.json(envelope(proposal));
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
test("missing configuration prevents external calls", () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.throws(() => requireOpenAiKey(), /noch nicht eingerichtet/);
  } finally {
    process.env.OPENAI_API_KEY = key;
  }
});
test("invalid or duplicated model exercises are rejected before any import", async () => {
  const invalid = structuredClone(proposal);
  invalid.days[0].exercises[0].sets = 500;
  await assert.rejects(
    generateProposal(assistantInput, [], mockResponse(envelope(invalid))),
    /ungültige Werte/,
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
    /ungültige Werte/,
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
test("audio uploads are bounded even without Content-Length and reject unsupported formats", async () => {
  const request = (type: string, body: Uint8Array) =>
    new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": type },
      body: new Blob([new Uint8Array(body)]),
    });
  await assert.rejects(
    readAudio(request("application/json", new Uint8Array(20))),
    /Audioformat/,
  );
  await assert.rejects(
    readAudio(request("audio/mp4", new Uint8Array(0))),
    /leer/,
  );
  await assert.rejects(
    readAudio(request("audio/webm", new Uint8Array(MAX_AUDIO_BYTES + 1))),
    /zu groß/,
  );
  const audio = await readAudio(
    request("audio/mp4;codecs=mp4a.40.2", new Uint8Array(30)),
  );
  assert.equal(audio.extension, "m4a");
  assert.equal(audio.bytes.length, 30);
});
test("transcription uploads a temporary file, returns bounded text and handles empty speech", async () => {
  const audio = {
    bytes: Buffer.alloc(30),
    mime: "audio/webm",
    extension: "webm",
  };
  const text = await transcribeAudio(audio, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
    const form = init!.body as FormData;
    assert.equal(form.get("language"), "de");
    assert.equal((form.get("file") as File).name, "aufnahme.webm");
    return Response.json({ text: "Bankdrücken und Klimmzüge" });
  });
  assert.equal(text, "Bankdrücken und Klimmzüge");
  await assert.rejects(
    transcribeAudio(audio, mockResponse({ text: "  " })),
    /Kein verwertbarer Text/,
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
