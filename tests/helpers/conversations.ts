import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/db";
import { processConversationJob } from "../../src/lib/conversation-worker";
import { createChatGptProvider } from "../../src/lib/ai-provider";
import {
  createConversation,
  getConversation,
  enqueueMessage,
  claimConversationJob,
  completeConversationJob,
  deleteConversation,
} from "../../src/lib/conversations";

export async function conversationPersistenceScenarios() {
  const dir = mkdtempSync(join(tmpdir(), "fitmin-conversations-"));
  const file = join(dir, "chat.db");
  let c = openDatabase(file);
  try {
    const input = {
      id: randomUUID(),
      kind: "workout",
      title: "Synthetisches Training",
    };
    const thread = createConversation(input, c);
    assert.deepEqual(createConversation(input, c), thread);
    assert.throws(
      () => createConversation({ ...input, kind: "advice" }, c),
      /bereits verwendet/,
    );
    const message = {
      schemaVersion: 1,
      clientMessageId: randomUUID(),
      expectedVersion: 0,
      text: "Drei Sätze erledigt",
    };
    // Failure after inserting messages must roll back the entire transaction.
    c.sqlite.exec(
      "CREATE TRIGGER reject_test_job BEFORE INSERT ON conversation_jobs BEGIN SELECT RAISE(ABORT, 'test failure'); END",
    );
    assert.throws(() => enqueueMessage(thread.id, message, c), /test failure/);
    assert.equal(getConversation(thread.id, c).messages.length, 0);
    assert.equal(getConversation(thread.id, c).version, 0);
    c.sqlite.exec("DROP TRIGGER reject_test_job");
    const queued = enqueueMessage(thread.id, message, c);
    assert.equal(queued.duplicate, false);
    assert.equal(enqueueMessage(thread.id, message, c).jobId, queued.jobId);
    assert.throws(
      () => enqueueMessage(thread.id, { ...message, text: "Anderer Text" }, c),
      /anderen Eingabe/,
    );
    assert.throws(
      () =>
        enqueueMessage(
          thread.id,
          { ...message, clientMessageId: randomUUID() },
          c,
        ),
      /geändert/,
    );
    assert.throws(
      () =>
        enqueueMessage(
          thread.id,
          { ...message, clientMessageId: randomUUID(), expectedVersion: 1 },
          c,
        ),
      /Bearbeitung/,
    );
    c.sqlite.close();
    c = openDatabase(file);
    assert.equal(getConversation(thread.id, c).messages[0].text, message.text);
    const first = claimConversationJob(c, 1000)!;
    assert.ok(first.lease);
    const secondConnection = openDatabase(file);
    try {
      assert.equal(claimConversationJob(secondConnection, 1001), null);
    } finally {
      secondConnection.sqlite.close();
    }
    const reply = {
      text: '{"answer":"Gut protokolliert."}',
      status: "completed" as const,
      truncated: false,
    };
    assert.equal(
      completeConversationJob(
        { ...first, lease: "wrong" },
        { text: "wrong", reply },
        c,
      ),
      false,
    );
    assert.equal(
      completeConversationJob(first, { text: "Gut protokolliert.", reply }, c),
      true,
    );
    assert.equal(
      completeConversationJob(first, { text: "duplicate", reply }, c),
      false,
    );
    assert.equal(getConversation(thread.id, c).version, 2);
    assert.equal(
      getConversation(thread.id, c).messages[1].text,
      "Gut protokolliert.",
    );
    const next = {
      ...message,
      clientMessageId: randomUUID(),
      expectedVersion: 2,
      text: "Was jetzt?",
    };
    enqueueMessage(thread.id, next, c);
    const interrupted = claimConversationJob(c, 2000)!;
    assert.equal(claimConversationJob(c, 182000), null);
    assert.equal(
      completeConversationJob(interrupted, { text: "Zu spät", reply }, c),
      false,
    );
    const recovered = getConversation(thread.id, c);
    assert.equal(recovered.version, 4);
    assert.equal(
      recovered.jobs.find((j) => j.id === interrupted.id)?.status,
      "interrupted",
    );
    assert.equal(recovered.messages.at(-1)?.status, "incomplete");
    await c.sqlite.backup(join(dir, "backup.db"));
    const backup = openDatabase(join(dir, "backup.db"));
    try {
      assert.deepEqual(getConversation(thread.id, backup), recovered);
    } finally {
      backup.sqlite.close();
    }
    let calls = 0;
    const provider = createChatGptProvider(
      async () => ({
        id: "test",
        clientId: "client",
        subject: "subject",
        email: "test@example.com",
        accessToken: "test-token",
        scopes: ["chatgpt.tokens.use.direct"],
        model: "test-model",
      }),
      async () => {
        calls++;
        return new Response(
          `data: ${JSON.stringify({ type: "response.completed", response: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ answer: "Gespeicherte Testantwort" }) }] }] } })}\n\n`,
        );
      },
    );
    enqueueMessage(
      thread.id,
      { ...next, clientMessageId: randomUUID(), expectedVersion: 4 },
      c,
    );
    assert.equal(await processConversationJob(c, provider), true);
    assert.equal(await processConversationJob(c, provider), false);
    assert.equal(calls, 1);
    assert.equal(
      getConversation(thread.id, c).messages.at(-1)?.text,
      "Gespeicherte Testantwort",
    );
    enqueueMessage(
      thread.id,
      { ...next, clientMessageId: randomUUID(), expectedVersion: 6 },
      c,
    );
    await processConversationJob(
      c,
      createChatGptProvider(async () => {
        throw new Error("private provider details");
      }),
    );
    const failed = getConversation(thread.id, c);
    assert.equal(failed.version, 8);
    assert.equal(failed.messages.at(-1)?.status, "failed");
    assert.equal(
      JSON.stringify(failed).includes("private provider details"),
      false,
    );
    assert.equal(await processConversationJob(c, provider), false);
    enqueueMessage(
      thread.id,
      { ...next, clientMessageId: randomUUID(), expectedVersion: 8 },
      c,
    );
    const deletedJob = claimConversationJob(c, 200000)!;
    deleteConversation(thread.id, c);
    assert.equal(
      completeConversationJob(
        deletedJob,
        { text: "Niemals wiederherstellen", reply },
        c,
      ),
      false,
    );
    for (const table of [
      "conversations",
      "conversation_messages",
      "conversation_jobs",
    ])
      assert.equal(
        (
          c.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as {
            n: number;
          }
        ).n,
        0,
      );
  } finally {
    c.sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
