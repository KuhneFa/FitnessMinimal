import { randomUUID } from "node:crypto";
import { getDatabase } from "@/db";
import { exercises } from "@/db/schema";
import { library, planSchema } from "./plans";
import {
  acceptedProposalSchema,
  normalizedExerciseName,
  type AcceptedProposal,
} from "./ai-contract";

export function importAcceptedProposal(input: AcceptedProposal) {
  const accepted = acceptedProposalSchema.parse(input);
  const { db, sqlite } = getDatabase();
  return sqlite
    .transaction(() => {
      const known = new Map(
        library().map((e) => [normalizedExerciseName(e.name), e]),
      );
      const used = new Map<string, typeof exercises.$inferSelect>();
      const plan = planSchema.parse({
        name: accepted.name,
        days: accepted.days.map((day) => ({
          name: day.name,
          exercises: day.exercises.map((item) => {
            const key = normalizedExerciseName(item.name);
            let exercise = known.get(key);
            if (!exercise) {
              exercise = {
                id: randomUUID(),
                name: item.name,
                muscle: item.muscle,
              };
              db.insert(exercises).values(exercise).run();
              known.set(key, exercise);
            }
            used.set(exercise.id, exercise);
            return {
              exerciseId: exercise.id,
              sets: item.sets,
              minReps: item.minReps,
              maxReps: item.maxReps,
              targetRir: item.targetRir,
              weight: item.weight ?? 0,
              increment: item.increment,
              rest: item.rest,
            };
          }),
        })),
      });
      return { plan, exercises: [...used.values()] };
    })
    .immediate();
}
