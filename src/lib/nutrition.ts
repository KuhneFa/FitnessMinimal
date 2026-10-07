import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { meals } from "@/db/schema";
import { HttpError } from "./http";
import { dateSchema, mealSchema, type Meal } from "./nutrition-contract";
export function diary(date: string, connection = getDatabase()): Meal[] {
  return connection.db
    .select()
    .from(meals)
    .where(eq(meals.date, dateSchema.parse(date)))
    .orderBy(asc(meals.createdAt), asc(meals.id))
    .all() as Meal[];
}
export function saveMeal(input: unknown, connection = getDatabase()) {
  const value = mealSchema.parse(input);
  return connection.sqlite
    .transaction(() => {
      const existing = connection.db
        .select()
        .from(meals)
        .where(eq(meals.id, value.id))
        .get();
      if (existing) {
        if (existing.version !== value.version)
          throw new HttpError(
            409,
            "Dieser Eintrag wurde inzwischen geändert. Bitte die Seite neu laden.",
          );
        connection.db
          .update(meals)
          .set({ ...value, version: value.version + 1 })
          .where(eq(meals.id, value.id))
          .run();
      } else {
        if (value.version !== 0)
          throw new HttpError(
            409,
            "Dieser Eintrag wurde gelöscht. Bitte die Seite neu laden.",
          );
        connection.db
          .insert(meals)
          .values({ ...value, version: 1, createdAt: Date.now() })
          .run();
      }
      return connection.db
        .select()
        .from(meals)
        .where(eq(meals.id, value.id))
        .get() as Meal;
    })
    .immediate();
}
export function deleteMeal(
  id: string,
  version: number,
  connection = getDatabase(),
) {
  const result = connection.db
    .delete(meals)
    .where(and(eq(meals.id, id), eq(meals.version, version)))
    .run();
  if (!result.changes)
    throw new HttpError(
      409,
      "Dieser Eintrag wurde inzwischen geändert oder gelöscht. Bitte die Seite neu laden.",
    );
}
