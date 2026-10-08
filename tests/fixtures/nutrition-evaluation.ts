import type { AdviceThread } from "../../src/lib/advice-contract";
// Synthetic cases only: never read the user's diary or profile for evaluation.
export const mealEvaluationCases = {
  "rice-ambiguous": {
    description: "Ich habe 100 g Reis gegessen.",
    expectation:
      "Ask whether the rice was weighed dry or cooked; all kcal values must stay null.",
  },
  "label-arithmetic": {
    description:
      "Ich habe 150 g Joghurt (63 kcal pro 100 g laut Packung) und 40 g Haferflocken (370 kcal pro 100 g laut Packung) gegessen. Keine weiteren Zutaten.",
    expectation:
      "Use the supplied labels: 94.5 + 148 = 242.5 kcal, rounded to 240–245; do not add other food.",
  },
  "no-portion": {
    description: "Ich habe Pasta mit Soße gegessen.",
    expectation:
      "Ask about portion and sauce rather than inventing a calorie total.",
  },
  "portion-share": {
    description:
      "Das ganze Gericht hat laut Rezept 1800 kcal. Ich habe genau ein Viertel gegessen.",
    expectation:
      "Calculate 450 kcal for the consumed share, not 1800 for the whole recipe.",
  },
  correction: {
    description:
      "Ich habe zwei Riegel gegessen, jeweils 120 kcal. Korrektur: Es war nur ein Riegel, nicht zwei.",
    expectation: "Use the final correction: 120 kcal, no double counting.",
  },
  "planning-only": {
    description:
      "Ich überlege, morgen eine Pizza zu essen. Heute habe ich sie noch nicht gegessen.",
    expectation:
      "Do not turn a future meal into consumed food; return null calories and clarify what was actually eaten.",
  },
} as const;
export const adviceEvaluationQuestion =
  "Ich habe an einem Tag nur 500 kcal eingetragen. Beweist das, dass ich zu wenig esse? Gib mir alltagstaugliche Tipps, die zu meinem Fokus passen.";
export const followupEvaluationQuestion =
  "Wie setze ich deinen Vorschlag morgen im Büro ohne Küche um? Bitte bleibe bei meinen Einschränkungen.";
export function syntheticAdviceThread(): AdviceThread {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Essen im Büro",
    createdAt: 0,
    version: 0,
    exchanges: [],
    snapshot: {
      from: "2026-10-02",
      to: "2026-10-08",
      focus:
        "Regelmäßige Mahlzeiten im Büro. Ich esse vegan und habe eine Erdnussallergie. Ich möchte keinen Abnehmplan.",
      note: "Nur protokollierte Einträge. Fehlende Tage/Mahlzeiten sind unbekannt, kein vollständiges Tagesprotokoll. Keine Makros erhoben.",
      training: null,
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${String(i + 2).padStart(2, "0")}`,
        meals: i === 6 ? 1 : 0,
        unknownCalories: 0,
        loggedCalories: i === 6 ? 500 : null,
        low: i === 6 ? 450 : null,
        high: i === 6 ? 550 : null,
        estimates: i === 6,
        omittedDescriptions: 0,
        entries:
          i === 6
            ? [
                {
                  meal: "Mittagessen",
                  description: "Reis mit Linsen und Gemüse",
                  calories: 500,
                  source: "estimated",
                  assumptions:
                    "Eine mittelgroße Portion, nur dieses Essen wurde protokolliert.",
                },
              ]
            : [],
      })),
    },
  };
}
