import { z } from "zod";

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 90;
export const assistantInputSchema = z
  .object({
    wishes: z.string().trim().min(10).max(6000),
    profile: z
      .object({
        age: z.number().int().min(1).max(120).nullable(),
        heightCm: z.number().min(50).max(250).nullable(),
        weightKg: z.number().min(20).max(400).nullable(),
        focus: z.string().trim().max(300),
        experience: z.enum([
          "unspecified",
          "beginner",
          "intermediate",
          "advanced",
        ]),
        daysPerWeek: z.number().int().min(1).max(7).nullable(),
      })
      .strict(),
  })
  .strict();
export type AssistantInput = z.infer<typeof assistantInputSchema>;
export const suggestedExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    muscle: z.string().trim().min(1).max(50),
    reason: z.string().trim().min(1).max(240),
    sets: z.number().int().min(1).max(10),
    minReps: z.number().int().min(1).max(50),
    maxReps: z.number().int().min(1).max(50),
    targetRir: z.number().int().min(0).max(10),
    weight: z.number().min(0).max(1000).nullable(),
    increment: z.number().min(0.1).max(50),
    rest: z.number().int().min(0).max(900),
  })
  .strict();
export const proposalShape = z
  .object({
    name: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(600),
    notes: z.array(z.string().trim().min(1).max(240)).max(4),
    days: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            exercises: z.array(suggestedExerciseSchema).min(1).max(8),
          })
          .strict(),
      )
      .min(1)
      .max(7),
  })
  .strict();
export const normalizedExerciseName = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
export const proposalSchema = proposalShape.superRefine((plan, ctx) => {
  plan.days.forEach((day, di) => {
    const names = new Set<string>();
    day.exercises.forEach((exercise, ei) => {
      const name = normalizedExerciseName(exercise.name);
      if (names.has(name))
        ctx.addIssue({
          code: "custom",
          message: "Die Übung kommt an diesem Tag doppelt vor.",
          path: ["days", di, "exercises", ei, "name"],
        });
      if (exercise.minReps > exercise.maxReps)
        ctx.addIssue({
          code: "custom",
          message: "Minimale Wiederholungen dürfen nicht größer als maximale Wiederholungen sein.",
          path: ["days", di, "exercises", ei, "maxReps"],
        });
      names.add(name);
    });
  });
});
export type PlanProposal = z.infer<typeof proposalSchema>;
export type SuggestedExercise = z.infer<typeof suggestedExerciseSchema>;
// Only explicitly accepted exercises are sent to the import endpoint.
export const acceptedProposalSchema = z
  .object({
    name: proposalShape.shape.name,
    days: proposalShape.shape.days,
  })
  .strict()
  .superRefine((value, ctx) => {
    const parsed = proposalSchema.safeParse({
      ...value,
      summary: "Bestätigte Auswahl",
      notes: [],
    });
    if (!parsed.success)
      ctx.addIssue({
        code: "custom",
        message: "Bitte die ausgewählten Übungen prüfen.",
      });
  });
export type AcceptedProposal = z.infer<typeof acceptedProposalSchema>;
