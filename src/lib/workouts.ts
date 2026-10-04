import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq, asc, and, desc, isNotNull } from "drizzle-orm";
import { getDatabase } from "@/db";
import { workouts, workoutExercises, workoutSets } from "@/db/schema";
import { listPlans, library } from "./plans";
import { HttpError } from "./http";
import { recommendWeight } from "./progression";
export const setSchema = z
  .object({
    weight: z.number().min(0).max(1000),
    reps: z.number().int().min(0).max(100).nullable(),
    rir: z.number().int().min(0).max(10).nullable(),
    completed: z.boolean(),
    version: z.number().int().min(0),
    mutationId: z.string().uuid(),
  })
  .refine(
    (v) => !v.completed || (v.reps !== null && v.reps > 0 && v.rir !== null),
    { message: "Abgeschlossene Sätze benötigen Wiederholungen" },
  );
export type SetInput = z.infer<typeof setSchema>;
export function activeWorkout() {
  return getDatabase()
    .db.select()
    .from(workouts)
    .where(eq(workouts.active, 1))
    .get();
}
export function previousExercise(exerciseId: string) {
  const { db } = getDatabase();
  const row = db
    .select({ exercise: workoutExercises, finishedAt: workouts.finishedAt })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        isNotNull(workouts.finishedAt),
      ),
    )
    .orderBy(desc(workouts.finishedAt))
    .get();
  return row
    ? {
        finishedAt: row.finishedAt,
        sets: db
          .select()
          .from(workoutSets)
          .where(eq(workoutSets.workoutExerciseId, row.exercise.id))
          .orderBy(asc(workoutSets.position))
          .all(),
      }
    : null;
}
export function getWorkout(id: string) {
  const { db } = getDatabase();
  const workout = db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!workout) throw new HttpError(404, "Workout nicht gefunden.");
  return {
    ...workout,
    exercises: db
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, id))
      .orderBy(asc(workoutExercises.position))
      .all()
      .map((e) => ({
        ...e,
        sets: db
          .select()
          .from(workoutSets)
          .where(eq(workoutSets.workoutExerciseId, e.id))
          .orderBy(asc(workoutSets.position))
          .all(),
        previous: previousExercise(e.exerciseId),
      })),
  };
}
export type Workout = ReturnType<typeof getWorkout>;
export const finishSchema = z.object({
  fatigue: z.number().int().min(1).max(5),
  performance: z.number().int().min(1).max(5),
  note: z.string().trim().max(2000),
  allowIncomplete: z.boolean(),
  versions: z.record(z.string().uuid(), z.number().int().min(0)),
});
export function finishWorkout(id: string, input: z.infer<typeof finishSchema>) {
  const data = finishSchema.parse(input);
  const { db, sqlite } = getDatabase();
  return sqlite
    .transaction(() => {
      const w = getWorkout(id);
      if (w.active !== 1) return w;
      const sets = w.exercises.flatMap((e) => e.sets);
      if (sets.some((s) => data.versions[s.id] !== s.version))
        throw new HttpError(
          409,
          "Das Workout wurde zwischenzeitlich geändert. Bitte neu laden und Werte prüfen.",
        );
      if (!sets.some((s) => s.completed))
        throw new HttpError(400, "Schließe mindestens einen Satz ab.");
      if (!data.allowIncomplete && sets.some((s) => !s.completed))
        throw new HttpError(
          400,
          "Es gibt noch offene Sätze. Bestätige den vorzeitigen Abschluss.",
        );
      db.update(workouts)
        .set({
          active: null,
          finishedAt: Date.now(),
          fatigue: data.fatigue,
          performance: data.performance,
          note: data.note,
          timerEnd: null,
          timerRemaining: null,
          timerVersion: w.timerVersion + 1,
        })
        .where(eq(workouts.id, id))
        .run();
      return getWorkout(id);
    })
    .immediate();
}
export function historyPage(page = 0) {
  return getDatabase()
    .db.select()
    .from(workouts)
    .where(isNotNull(workouts.finishedAt))
    .orderBy(desc(workouts.finishedAt))
    .limit(20)
    .offset(Math.max(0, page) * 20)
    .all();
}
export function exerciseHistory(exerciseId: string, page = 0) {
  const { db } = getDatabase();
  return db
    .select({ exercise: workoutExercises, workout: workouts })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        isNotNull(workouts.finishedAt),
      ),
    )
    .orderBy(desc(workouts.finishedAt))
    .limit(20)
    .offset(Math.max(0, page) * 20)
    .all()
    .map((row) => ({
      ...row,
      sets: db
        .select()
        .from(workoutSets)
        .where(eq(workoutSets.workoutExerciseId, row.exercise.id))
        .orderBy(asc(workoutSets.position))
        .all(),
    }));
}
export function startWorkout(dayId: string) {
  const { db, sqlite } = getDatabase();
  return sqlite
    .transaction(() => {
      const active = activeWorkout();
      if (active) return active.id;
      const plan = listPlans().find((p) => p.days.some((d) => d.id === dayId));
      const day = plan?.days.find((d) => d.id === dayId);
      if (!day || !plan)
        throw new HttpError(404, "Trainingstag nicht gefunden.");
      if (!day.exercises.length)
        throw new HttpError(400, "Füge zuerst Übungen zum Trainingstag hinzu.");
      const id = randomUUID();
      const now = Date.now();
      db.insert(workouts)
        .values({
          id,
          dayName: day.name,
          planName: plan.name,
          startedAt: now,
          active: 1,
        })
        .run();
      const names = new Map(library().map((e) => [e.id, e.name]));
      day.exercises.forEach((item) => {
        const recommendation = recommendWeight({
          baseWeight: item.weight,
          increment: item.increment,
          sets: item.sets,
          minReps: item.minReps,
          maxReps: item.maxReps,
          targetRir: item.targetRir,
          previous: previousExercise(item.exerciseId)?.sets || null,
        });
        const eid = randomUUID();
        db.insert(workoutExercises)
          .values({
            id: eid,
            workoutId: id,
            exerciseId: item.exerciseId,
            name: names.get(item.exerciseId)!,
            position: item.position,
            minReps: item.minReps,
            maxReps: item.maxReps,
            targetRir: item.targetRir,
            increment: item.increment,
            rest: item.rest,
            recommendation: recommendation.reason,
          })
          .run();
        for (let position = 0; position < item.sets; position++)
          db.insert(workoutSets)
            .values({
              id: randomUUID(),
              workoutExerciseId: eid,
              position,
              weight: recommendation.weight,
              updatedAt: now,
            })
            .run();
      });
      return id;
    })
    .immediate();
}
export function saveSet(workoutId: string, setId: string, input: SetInput) {
  const data = setSchema.parse(input);
  const { db, sqlite } = getDatabase();
  return sqlite
    .transaction(() => {
      const workout = db
        .select()
        .from(workouts)
        .where(eq(workouts.id, workoutId))
        .get();
      if (!workout) throw new HttpError(404, "Workout nicht gefunden.");
      if (workout.active !== 1)
        throw new HttpError(409, "Workout ist bereits abgeschlossen.");
      const row = db
        .select({ set: workoutSets })
        .from(workoutSets)
        .innerJoin(
          workoutExercises,
          eq(workoutExercises.id, workoutSets.workoutExerciseId),
        )
        .where(
          and(
            eq(workoutSets.id, setId),
            eq(workoutExercises.workoutId, workoutId),
          ),
        )
        .get();
      if (!row) throw new HttpError(404, "Satz nicht gefunden.");
      if (row.set.mutationId === data.mutationId) return row.set;
      if (row.set.version !== data.version)
        throw new HttpError(
          409,
          "Dieser Satz wurde in einem anderen Fenster geändert. Bitte Werte vergleichen und den Serverstand laden.",
        );
      if (data.completed && !row.set.completed) {
        const exercise = db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.id, row.set.workoutExerciseId))
          .get()!;
        db.update(workouts)
          .set({
            timerEnd: exercise.rest ? Date.now() + exercise.rest * 1000 : null,
            timerRemaining: null,
            timerVersion: workout.timerVersion + 1,
          })
          .where(eq(workouts.id, workoutId))
          .run();
      }
      const { version, ...values } = data;
      db.update(workoutSets)
        .set({ ...values, version: version + 1, updatedAt: Date.now() })
        .where(eq(workoutSets.id, setId))
        .run();
      return db
        .select()
        .from(workoutSets)
        .where(eq(workoutSets.id, setId))
        .get()!;
    })
    .immediate();
}
