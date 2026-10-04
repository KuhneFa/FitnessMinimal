import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { workouts } from "@/db/schema";
import { HttpError } from "./http";
import { changeTimer, type TimerAction } from "./timer";
export function readTimer(id: string) {
  const row = getDatabase()
    .db.select()
    .from(workouts)
    .where(eq(workouts.id, id))
    .get();
  if (!row) throw new HttpError(404, "Workout nicht gefunden.");
  return {
    timerEnd: row.timerEnd,
    timerRemaining: row.timerRemaining,
    timerVersion: row.timerVersion,
    active: row.active,
  };
}
export function updateTimer(id: string, action: TimerAction, version: number) {
  const { db, sqlite } = getDatabase();
  return sqlite
    .transaction(() => {
      const state = readTimer(id);
      if (state.active !== 1)
        throw new HttpError(409, "Workout abgeschlossen.");
      if (state.timerVersion !== version)
        throw new HttpError(409, "Timer wurde geändert. Erneut versuchen.");
      const next = changeTimer(state, action, Date.now());
      db.update(workouts).set(next).where(eq(workouts.id, id)).run();
      return next;
    })
    .immediate();
}
