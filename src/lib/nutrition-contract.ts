import { z } from "zod";
import { embeddedObject } from "./plan-response";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const value = new Date(`${date}T12:00:00Z`);
    return (
      Number.isFinite(value.getTime()) &&
      value.toISOString().slice(0, 10) === date &&
      date >= "2000-01-01" &&
      date <= "2100-12-31"
    );
  }, "Bitte ein gültiges Datum wählen.");
export const mealCategories = [
  "Frühstück",
  "Mittagessen",
  "Abendessen",
  "Snack",
  "Getränk",
] as const;
const calories = z.number().int().min(0).max(15000).nullable();
export const estimateFields = z.object({
  calories,
  caloriesLow: calories,
  caloriesHigh: calories,
  assumptions: z.string().trim().max(1200),
});
function validRange(value: z.infer<typeof estimateFields>) {
  return value.calories === null
    ? value.caloriesLow === null && value.caloriesHigh === null
    : value.caloriesLow !== null &&
        value.caloriesHigh !== null &&
        value.caloriesLow <= value.calories &&
        value.calories <= value.caloriesHigh;
}
export const estimateSchema = estimateFields
  .extend({
    clarification: z.string().trim().max(600),
  })
  .strict()
  .refine(validRange, "Die Kalorienspanne passt nicht zum Schätzwert.")
  .refine(
    (v) => v.calories !== null || !!v.clarification,
    "Bei fehlenden Mengen ist eine Rückfrage erforderlich.",
  )
  .refine(
    (v) => v.calories === null || !!v.assumptions,
    "Die Schätzung muss ihre Portionsannahmen nennen.",
  )
  .refine(
    (v) => !v.clarification || v.calories === null,
    "Bei einer offenen Rückfrage müssen die Kalorien noch offen bleiben.",
  );
export const mealSchema = estimateFields
  .extend({
    id: z.string().uuid(),
    date: dateSchema,
    category: z.enum(mealCategories),
    description: z.string().trim().min(2).max(6000),
    source: z.enum(["unknown", "manual", "estimated"]),
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine(validRange, "Bitte die Kalorienspanne prüfen.")
  .refine(
    (v) => (v.source === "unknown") === (v.calories === null),
    "Kalorien und Herkunft passen nicht zusammen.",
  )
  .refine(
    (v) => v.source !== "estimated" || !!v.assumptions,
    "Bitte Portionsannahmen erhalten.",
  );
export type MealInput = z.infer<typeof mealSchema>;
export type Meal = MealInput & { createdAt: number };
export type MealEstimate = z.infer<typeof estimateSchema>;
export const estimateRequestSchema = z.object({
  description: z.string().trim().min(2).max(6000),
  mode: z.enum(["generate", "prompt", "import"]),
  reply: z.string().max(65536).optional(),
});
export function parseNutritionResponse<T>(
  source: string,
  schema: z.ZodType<T>,
): T {
  if (new TextEncoder().encode(source).length > 65536)
    throw new Error("Antwort zu groß. Maximal 64 KB sind erlaubt.");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    const object = embeddedObject(source);
    if (!object)
      throw new Error(
        "Die Antwort enthält kein eindeutiges vollständiges JSON-Objekt. Die Originalantwort bleibt einsehbar.",
      );
    try {
      value = JSON.parse(object);
    } catch {
      throw new Error(
        "Das JSON ist nicht lesbar. Bitte die Originalantwort prüfen.",
      );
    }
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `Die Antwort enthält ungültige Angaben: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "Format"}: ${i.message}`)
        .join("; ")}. Es wurde nichts gespeichert.`,
    );
  return parsed.data;
}
export function todayDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(
    new Date(),
  );
}
export function moveDate(date: string, delta: number) {
  const value = new Date(`${dateSchema.parse(date)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}
export function mealTotals(
  rows: Pick<Meal, "calories" | "caloriesLow" | "caloriesHigh" | "source">[],
) {
  const known = rows.filter((m) => m.calories !== null);
  return {
    count: rows.length,
    unknown: rows.length - known.length,
    estimated: rows.some((m) => m.source === "estimated"),
    calories: known.length
      ? known.reduce((sum, m) => sum + m.calories!, 0)
      : null,
    low: known.length
      ? known.reduce((sum, m) => sum + m.caloriesLow!, 0)
      : null,
    high: known.length
      ? known.reduce((sum, m) => sum + m.caloriesHigh!, 0)
      : null,
  };
}
