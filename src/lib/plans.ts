import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq, asc } from "drizzle-orm";
import { getDatabase } from "@/db";
import { assignments, days, exercises, plans } from "@/db/schema";
const name = z.string().trim().min(1).max(80);
export const exerciseSchema = z.object({
  name,
  muscle: z.string().trim().max(50),
});
export const assignmentSchema = z
  .object({
    exerciseId: z.string().uuid(),
    sets: z.number().int().min(1).max(10),
    minReps: z.number().int().min(1).max(50),
    maxReps: z.number().int().min(1).max(50),
    targetRir: z.number().int().min(0).max(10),
    weight: z.number().min(0).max(1000),
    increment: z.number().min(0.1).max(50),
    rest: z.number().int().min(0).max(900),
  })
  .refine((v) => v.minReps <= v.maxReps, {
    message: "Wiederholungsbereich ungültig",
  });
export const planSchema = z.object({
  name,
  days: z
    .array(
      z.object({
        name,
        exercises: z
          .array(assignmentSchema)
          .max(20)
          .refine(
            (v) => new Set(v.map((x) => x.exerciseId)).size === v.length,
            "Übung doppelt",
          ),
      }),
    )
    .min(1)
    .max(14),
});
export type PlanInput = z.infer<typeof planSchema>;
export function library() {
  return getDatabase()
    .db.select()
    .from(exercises)
    .orderBy(asc(exercises.name))
    .all();
}
export function listPlans() {
  const { db } = getDatabase();
  return db
    .select()
    .from(plans)
    .all()
    .map((plan) => ({
      ...plan,
      days: db
        .select()
        .from(days)
        .where(eq(days.planId, plan.id))
        .orderBy(asc(days.position))
        .all()
        .map((day) => ({
          ...day,
          exercises: db
            .select()
            .from(assignments)
            .where(eq(assignments.dayId, day.id))
            .orderBy(asc(assignments.position))
            .all(),
        })),
    }));
}
export function savePlan(input: PlanInput, id?: string) {
  const { db } = getDatabase();
  const data = planSchema.parse(input);
  const planId = id || randomUUID();
  db.transaction((tx) => {
    if (id) {
      if (!tx.select().from(plans).where(eq(plans.id, id)).get())
        throw new Error("Plan nicht gefunden");
      tx.update(plans).set({ name: data.name }).where(eq(plans.id, id)).run();
      tx.delete(days).where(eq(days.planId, id)).run();
    } else tx.insert(plans).values({ id: planId, name: data.name }).run();
    data.days.forEach((day, position) => {
      const dayId = randomUUID();
      tx.insert(days)
        .values({ id: dayId, planId, name: day.name, position })
        .run();
      day.exercises.forEach((item, index) =>
        tx
          .insert(assignments)
          .values({ ...item, id: randomUUID(), dayId, position: index })
          .run(),
      );
    });
  });
  return planId;
}
