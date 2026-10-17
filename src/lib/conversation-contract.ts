import { z } from "zod";

// Versioned wire contracts for B1. These validate data, never execute actions.
const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const entityId = z.string().uuid();
const reference = z.object({ id: entityId, version }).strict();

export const conversationKindSchema = z.enum([
  "onboarding",
  "plan",
  "workout",
  "advice",
  "diary",
]);
export const messageInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    clientMessageId: entityId,
    expectedVersion: version,
    text: z.string().trim().min(1).max(6000),
  })
  .strict();

// Cards carry references, not model-authored duplicate values or HTML.
export const conversationCardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plan_overview"), plan: reference }).strict(),
  z
    .object({ type: z.literal("workout_overview"), workout: reference })
    .strict(),
  z
    .object({
      type: z.literal("exercise"),
      workout: reference,
      exerciseId: entityId,
    })
    .strict(),
  z
    .object({
      type: z.literal("exercise_result"),
      workout: reference,
      exerciseId: entityId,
    })
    .strict(),
  z.object({ type: z.literal("workout_summary"), workout: reference }).strict(),
  z.object({ type: z.literal("meal"), meal: reference }).strict(),
]);
export const conversationMessageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: entityId,
    conversationId: entityId,
    sequence: version,
    role: z.enum(["user", "assistant", "app"]),
    status: z.enum(["pending", "completed", "incomplete", "failed"]),
    text: z.string().max(65536),
    cards: z.array(conversationCardSchema).max(12),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();
export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "interrupted",
  "cancelled",
]);

// Workout completion keeps using the existing finish endpoint with all set
// versions and its review. It cannot be triggered by a free-text model answer.
export const workoutActionSchema = z
  .object({
    schemaVersion: z.literal(1),
    mutationId: entityId,
    expectedVersion: version,
    action: z.enum(["pause", "resume", "complete_exercise", "skip_exercise"]),
    exerciseId: entityId.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const exerciseAction =
      value.action === "complete_exercise" || value.action === "skip_exercise";
    if (exerciseAction !== (value.exerciseId !== undefined))
      ctx.addIssue({
        code: "custom",
        path: ["exerciseId"],
        message: "Übungsaktionen benötigen genau eine Übungs-ID.",
      });
  });

export type ConversationKind = z.infer<typeof conversationKindSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationCard = z.infer<typeof conversationCardSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
