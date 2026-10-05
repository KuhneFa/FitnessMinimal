import { z } from "zod";
import { proposalSchema, type PlanProposal } from "./ai-contract";

export class PlanResponseError extends Error {}

const fields: Record<string, string> = {
  name: "Name (1–80 Zeichen)",
  summary: "Zusammenfassung (1–600 Zeichen)",
  notes: "Hinweise (höchstens 4 Texte mit je 1–240 Zeichen)",
  days: "Trainingstage (1–7)",
  exercises: "Übungen (1–8 je Tag)",
  muscle: "Muskelgruppe (1–50 Zeichen)",
  reason: "Begründung (1–240 Zeichen)",
  sets: "Sätze (ganze Zahl von 1 bis 10)",
  minReps: "Minimale Wiederholungen (ganze Zahl von 1 bis 50)",
  maxReps: "Maximale Wiederholungen (ganze Zahl von 1 bis 50)",
  targetRir: "RIR (ganze Zahl von 0 bis 10)",
  weight: "Trainingsgewicht (0–1.000 kg oder null)",
  increment: "Steigerung (0,1–50 kg)",
  rest: "Satzpause (ganze Zahl von 0 bis 900 Sekunden)",
};
const numericFields = [
  "sets", "minReps", "maxReps", "targetRir", "weight", "increment", "rest",
];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function describeIssues(error: z.ZodError) {
  return error.issues.slice(0, 3).map((issue) => {
    const path = issue.path;
    const location = [
      typeof path[1] === "number" ? `Tag ${path[1] + 1}` : "",
      typeof path[3] === "number" ? `Übung ${path[3] + 1}` : "",
    ].filter(Boolean).join(", ");
    const key = [...path].reverse().find((part) => typeof part === "string");
    const detail = issue.code === "custom"
      ? issue.message
      : issue.code === "unrecognized_keys"
        ? "Zusätzliche Felder sind nicht erlaubt."
        : `${fields[String(key)] || "Planformat"}: fehlt oder entspricht nicht der Vorgabe.`;
    return `${location ? `${location}: ` : ""}${detail}`;
  }).join(" ");
}

// Shared by the subscription response and manual ChatGPT import. Normalize
// formatting only: never drop exercises, clamp values or infer missing weights.
export function parsePlanResponse(source: string): PlanProposal {
  if (new TextEncoder().encode(source).length > 65536)
    throw new PlanResponseError("Der KI-Entwurf ist zu groß. Erlaubt sind höchstens 64 KB. Es wurde nichts übernommen.");
  const text = source.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PlanResponseError("Der KI-Entwurf enthält kein vollständiges JSON-Objekt. Bitte die vollständige JSON-Antwort anfordern oder kopieren. Es wurde nichts übernommen.");
  }
  if (isObject(value) && Array.isArray(value.days)) {
    for (const day of value.days) {
      if (!isObject(day) || !Array.isArray(day.exercises)) continue;
      for (const exercise of day.exercises) {
        if (!isObject(exercise)) continue;
        for (const key of numericFields) {
          const raw = exercise[key];
          if (typeof raw === "string" && /^-?\d+(?:[.,]\d+)?$/.test(raw.trim()))
            exercise[key] = Number(raw.trim().replace(",", "."));
        }
      }
    }
  }
  const parsed = proposalSchema.safeParse(value);
  if (!parsed.success)
    throw new PlanResponseError(`Der KI-Entwurf enthielt ungültige Werte. ${describeIssues(parsed.error)} Es wurde nichts übernommen. Bitte den Entwurf mit diesen Vorgaben korrigieren lassen.`);
  return parsed.data;
}
