import { randomUUID } from "node:crypto";
import { and, asc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  conversations,
  conversationMessages as messages,
  conversationJobs as jobs,
} from "@/db/schema";
import {
  conversationKindSchema,
  conversationMessageSchema,
  messageInputSchema,
} from "./conversation-contract";
import { modelReplySchema, type ModelReply } from "./ai-contract";
import { HttpError } from "./http";

type Connection = ReturnType<typeof getDatabase>;
export const createConversationSchema = z
  .object({
    id: z.string().uuid(),
    kind: conversationKindSchema,
    title: z.string().trim().min(1).max(120),
  })
  .strict();
export const MAX_CONVERSATION_MESSAGES = 60;

export function createConversation(input: unknown, connection = getDatabase()) {
  const data = createConversationSchema.parse(input);
  const { db, sqlite } = connection;
  return sqlite
    .transaction(() => {
      const existing = db
        .select()
        .from(conversations)
        .where(eq(conversations.id, data.id))
        .get();
      if (existing) {
        if (existing.kind !== data.kind || existing.title !== data.title)
          throw new HttpError(
            409,
            "Diese Gesprächs-ID wird bereits verwendet.",
          );
        return existing;
      }
      return db
        .insert(conversations)
        .values({ ...data, createdAt: Date.now() })
        .returning()
        .get();
    })
    .immediate();
}

export function getConversation(id: string, connection = getDatabase()) {
  const { db } = connection;
  const thread = db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();
  if (!thread) throw new HttpError(404, "Gespräch nicht gefunden.");
  const entries = db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.sequence))
    .all();
  return {
    ...thread,
    messages: entries.map(({ cards, ...entry }) =>
      conversationMessageSchema.parse({
        ...entry,
        schemaVersion: 1,
        cards: JSON.parse(cards),
      }),
    ),
    jobs: db
      .select({
        id: jobs.id,
        status: jobs.status,
        error: jobs.error,
        reply: jobs.reply,
      })
      .from(jobs)
      .where(eq(jobs.conversationId, id))
      .all()
      .map(({ reply, ...job }) => ({
        ...job,
        reply: reply ? modelReplySchema.parse(JSON.parse(reply)) : null,
      })),
  };
}

export function enqueueMessage(
  id: string,
  input: unknown,
  connection = getDatabase(),
) {
  const data = messageInputSchema.parse(input);
  const { db, sqlite } = connection;
  return sqlite
    .transaction(() => {
      const existing = db
        .select()
        .from(messages)
        .where(eq(messages.id, data.clientMessageId))
        .get();
      if (existing) {
        const job = db
          .select()
          .from(jobs)
          .where(eq(jobs.userMessageId, existing.id))
          .get();
        if (
          !job ||
          existing.conversationId !== id ||
          existing.text !== data.text ||
          job.baseVersion !== data.expectedVersion + 1
        )
          throw new HttpError(
            409,
            "Die Nachrichten-ID gehört zu einer anderen Eingabe.",
          );
        return { messageId: existing.id, jobId: job.id, duplicate: true };
      }
      const thread = getConversation(id, connection);
      if (thread.version !== data.expectedVersion)
        throw new HttpError(
          409,
          "Das Gespräch wurde geändert. Bitte den aktuellen Stand laden.",
        );
      if (
        thread.jobs.some((j) => j.status === "queued" || j.status === "running")
      )
        throw new HttpError(409, "Eine Antwort ist noch in Bearbeitung.");
      if (thread.messages.length + 2 > MAX_CONVERSATION_MESSAGES)
        throw new HttpError(
          409,
          "Dieses Gespräch ist voll. Bitte ein neues Gespräch beginnen; der bisherige Verlauf bleibt erhalten.",
        );
      const now = Date.now(),
        assistantId = randomUUID(),
        jobId = randomUUID();
      db.insert(messages)
        .values([
          {
            id: data.clientMessageId,
            conversationId: id,
            sequence: thread.messages.length,
            role: "user",
            status: "completed",
            text: data.text,
            createdAt: now,
          },
          {
            id: assistantId,
            conversationId: id,
            sequence: thread.messages.length + 1,
            role: "assistant",
            status: "pending",
            text: "",
            createdAt: now,
          },
        ])
        .run();
      db.update(conversations)
        .set({ version: thread.version + 1 })
        .where(eq(conversations.id, id))
        .run();
      db.insert(jobs)
        .values({
          id: jobId,
          conversationId: id,
          userMessageId: data.clientMessageId,
          assistantMessageId: assistantId,
          baseVersion: thread.version + 1,
          status: "queued",
          createdAt: now,
          input: JSON.stringify({
            kind: thread.kind,
            conversation: [
              ...thread.messages
                .filter((m) => m.status === "completed")
                .map((m) => ({ role: m.role, text: m.text })),
              { role: "user", text: data.text },
            ],
          }),
        })
        .run();
      return { messageId: data.clientMessageId, jobId, duplicate: false };
    })
    .immediate();
}

export function deleteConversation(id: string, connection = getDatabase()) {
  connection.db.delete(conversations).where(eq(conversations.id, id)).run();
}

// A lease expiry is an interrupted request, never a retry: the remote service
// may have completed inference even though this process lost the response.
export function claimConversationJob(
  connection = getDatabase(),
  now = Date.now(),
) {
  const { db, sqlite } = connection;
  return sqlite
    .transaction(() => {
      const expired = db
        .select()
        .from(jobs)
        .where(and(eq(jobs.status, "running"), lte(jobs.leaseUntil, now)))
        .all();
      for (const job of expired) {
        db.update(jobs)
          .set({
            status: "interrupted",
            error:
              "Die Antwort wurde unterbrochen. Es wird nicht automatisch erneut angefragt.",
            lease: null,
            leaseUntil: null,
          })
          .where(eq(jobs.id, job.id))
          .run();
        db.update(messages)
          .set({ status: "incomplete" })
          .where(eq(messages.id, job.assistantMessageId))
          .run();
        db.update(conversations)
          .set({ version: job.baseVersion + 1 })
          .where(
            and(
              eq(conversations.id, job.conversationId),
              eq(conversations.version, job.baseVersion),
            ),
          )
          .run();
      }
      const job = db
        .select()
        .from(jobs)
        .where(eq(jobs.status, "queued"))
        .orderBy(asc(jobs.createdAt))
        .get();
      if (!job) return null;
      return db
        .update(jobs)
        .set({
          status: "running",
          lease: randomUUID(),
          leaseUntil: now + 180000,
        })
        .where(eq(jobs.id, job.id))
        .returning()
        .get();
    })
    .immediate();
}

export type ConversationJob = NonNullable<
  ReturnType<typeof claimConversationJob>
>;
export function completeConversationJob(
  job: ConversationJob,
  result:
    { text: string; reply: ModelReply } | { error: string; reply?: ModelReply },
  connection: Connection = getDatabase(),
) {
  // Validate before opening a transaction; never store an unbounded raw payload.
  const text =
    "text" in result
      ? z.string().trim().min(1).max(4000).parse(result.text)
      : "";
  const error =
    "error" in result ? z.string().max(2000).parse(result.error) : null;
  const reply = result.reply ? modelReplySchema.parse(result.reply) : null;
  const { db, sqlite } = connection;
  return sqlite
    .transaction(() => {
      const current = db.select().from(jobs).where(eq(jobs.id, job.id)).get();
      if (
        !current ||
        current.status !== "running" ||
        current.lease !== job.lease
      )
        return false;
      const thread = db
        .select()
        .from(conversations)
        .where(eq(conversations.id, job.conversationId))
        .get();
      if (!thread || thread.version !== job.baseVersion) {
        db.update(jobs)
          .set({
            status: "interrupted",
            error: "Die Antwort gehört zu einem älteren Gesprächsstand.",
            reply: reply ? JSON.stringify(reply) : null,
            lease: null,
            leaseUntil: null,
          })
          .where(eq(jobs.id, job.id))
          .run();
        db.update(messages)
          .set({ status: "incomplete" })
          .where(eq(messages.id, job.assistantMessageId))
          .run();
        return false;
      }
      db.update(messages)
        .set({ text, status: error ? "failed" : "completed" })
        .where(eq(messages.id, job.assistantMessageId))
        .run();
      db.update(jobs)
        .set({
          status: error ? "failed" : "completed",
          error,
          reply: reply ? JSON.stringify(reply) : null,
          lease: null,
          leaseUntil: null,
        })
        .where(eq(jobs.id, job.id))
        .run();
      db.update(conversations)
        .set({ version: thread.version + 1 })
        .where(eq(conversations.id, thread.id))
        .run();
      return true;
    })
    .immediate();
}
