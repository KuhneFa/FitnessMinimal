import type { AssistantInput, PlanProposal } from "../../src/lib/ai-contract";
export const assistantInput: AssistantInput = {
  wishes:
    "Ich möchte Bankdrücken mit 80 kg und Klimmzüge für Muskelaufbau trainieren.",
  profile: {
    age: 30,
    heightCm: 180,
    weightKg: 85,
    focus: "Muskelaufbau",
    experience: "intermediate",
    daysPerWeek: 2,
  },
};
export const proposal: PlanProposal = {
  name: "Mein Oberkörperplan",
  summary: "Zwei Übungen passend zu deinen Wünschen.",
  notes: ["Ohne genanntes Trainingsgewicht bleibt das Gewicht offen."],
  days: [
    {
      name: "Oberkörper A",
      exercises: [
        {
          name: "Bankdrücken",
          muscle: "Brust",
          reason: "Deine gewünschte Druckübung.",
          sets: 3,
          minReps: 8,
          maxReps: 10,
          targetRir: 2,
          weight: 80,
          increment: 2.5,
          rest: 120,
        },
        {
          name: "Klimmzüge",
          muscle: "Rücken",
          reason: "Ergänzt die Zugbewegung.",
          sets: 3,
          minReps: 6,
          maxReps: 10,
          targetRir: 2,
          weight: null,
          increment: 2.5,
          rest: 120,
        },
      ],
    },
  ],
};
