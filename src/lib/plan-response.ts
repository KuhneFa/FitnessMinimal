import { z } from "zod";
import {
  AI_TRAINING_LIMITS as limits,
  MAX_MODEL_REPLY_BYTES,
  proposalSchema,
  type ModelReply,
  type PlanProposal,
} from "./ai-contract";

export class PlanResponseError extends Error {}

const fields: Record<string, string> = {
  name: "Name (1–80 Zeichen)",
  summary: "Zusammenfassung (1–600 Zeichen)",
  notes: "Hinweise (höchstens 4 Texte mit je 1–240 Zeichen)",
  days: "Trainingstage (1–7)",
  exercises: "Übungen (1–8 je Tag)",
  muscle: "Muskelgruppe (1–50 Zeichen)",
  reason: "Begründung (1–240 Zeichen)",
  sets: `Sätze (ganze Zahl von ${limits.sets[0]} bis ${limits.sets[1]})`,
  minReps: `Minimale Wiederholungen pro Satz (${limits.reps[0]}–${limits.reps[1]})`,
  maxReps: `Maximale Wiederholungen pro Satz (${limits.reps[0]}–${limits.reps[1]})`,
  targetRir: `RIR (ganze Zahl von ${limits.rir[0]} bis ${limits.rir[1]})`,
  weight: `Trainingsgewicht (${limits.weight[0]}–${limits.weight[1]} kg oder null)`,
  increment: `Steigerung (${limits.increment[0]}–${limits.increment[1]} kg)`,
  rest: `Satzpause (${limits.restSeconds[0]}–${limits.restSeconds[1]} Sekunden)`,
};
const numericFields = [
  "sets",
  "minReps",
  "maxReps",
  "targetRir",
  "weight",
  "increment",
  "rest",
];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function describeIssues(error: z.ZodError) {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path;
      const location = [
        path[0] === "days" && typeof path[1] === "number"
          ? `Tag ${path[1] + 1}`
          : "",
        path[2] === "exercises" && typeof path[3] === "number"
          ? `Übung ${path[3] + 1}`
          : "",
        path[0] === "notes" && typeof path[1] === "number"
          ? `Hinweis ${path[1] + 1}`
          : "",
      ]
        .filter(Boolean)
        .join(", ");
      const key = [...path].reverse().find((part) => typeof part === "string");
      const detail =
        issue.code === "custom"
          ? issue.message
          : issue.code === "unrecognized_keys"
            ? "Zusätzliche Felder sind nicht erlaubt."
            : `${fields[String(key)] || "Planformat"}: fehlt oder entspricht nicht der Vorgabe.`;
      return `${location ? `${location}: ` : ""}${detail}`;
    })
    .join(" ");
}

export function modelReply(
  text: string,
  status: ModelReply["status"],
): ModelReply {
  const bytes = new TextEncoder().encode(text);
  const truncated = bytes.length > MAX_MODEL_REPLY_BYTES;
  return {
    text: truncated
      ? new TextDecoder().decode(bytes.slice(0, MAX_MODEL_REPLY_BYTES), {
          stream: true,
        })
      : text,
    status,
    truncated,
  };
}

// Extract one complete object from a reply with surrounding prose. Never repair
// incomplete JSON, select between competing objects, or change prescription values.
function embeddedObject(text: string): string | null {
  const objects: string[] = [];
  let depth = 0,
    start = -1,
    quoted = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (depth && quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (depth && char === '"') quoted = true;
    else if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (depth && char === "}") {
      depth--;
      if (!depth) objects.push(text.slice(start, i + 1));
    }
  }
  return depth === 0 && objects.length === 1 ? objects[0] : null;
}

// Shared by the subscription response and manual ChatGPT import. Normalize
// formatting only: never drop exercises, clamp values or infer missing weights.
export function parsePlanResponse(source: string): PlanProposal {
  if (new TextEncoder().encode(source).length > MAX_MODEL_REPLY_BYTES)
    throw new PlanResponseError(
      "Der KI-Entwurf ist zu groß. Erlaubt sind höchstens 64 KB. Es wurde nichts übernommen.",
    );
  const text = source
    .trim()
    .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let value: unknown;
  if (!text)
    throw new PlanResponseError(
      "ChatGPT hat keinen Antworttext geliefert. Es wurde kein Plan übernommen.",
    );
  try {
    value = JSON.parse(text);
  } catch {
    try {
      const object = embeddedObject(text);
      if (!object) throw new Error();
      value = JSON.parse(object);
    } catch {
      throw new PlanResponseError(
        "ChatGPT hat keinen eindeutig lesbaren Trainingsplan geliefert. Die Originalantwort ist unten einsehbar; es wurde nichts übernommen.",
      );
    }
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
    throw new PlanResponseError(
      `Der KI-Entwurf enthielt ungültige Werte. ${describeIssues(parsed.error)} Es wurde nichts übernommen. Bitte den Entwurf mit diesen Vorgaben korrigieren lassen.`,
    );
  return parsed.data;
}
