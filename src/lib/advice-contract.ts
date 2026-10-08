import { z } from "zod";
import { dateSchema } from "./nutrition-contract";
export const adviceSetupSchema = z.object({
  id: z.string().uuid(),
  endDate: dateSchema.refine(
    (date) => date >= "2000-01-07",
    "Bitte ein Datum ab dem 07.01.2000 wählen.",
  ),
  focus: z.string().trim().max(600),
  includeTraining: z.boolean(),
});
export const adviceActionSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().min(0).max(6),
  question: z.string().trim().min(2).max(2000),
  mode: z.enum(["generate", "prompt", "import"]),
  reply: z.string().max(65536).optional(),
});
export const adviceAnswerSchema = z
  .object({ answer: z.string().trim().min(1).max(4000) })
  .strict();
export type AdviceSnapshot = {
  from: string;
  to: string;
  focus: string;
  note: string;
  days: {
    date: string;
    meals: number;
    unknownCalories: number;
    loggedCalories: number | null;
    low: number | null;
    high: number | null;
    estimates: boolean;
    omittedDescriptions: number;
    entries: {
      meal: string;
      description: string;
      calories: number | null;
      source: string;
      assumptions: string;
    }[];
  }[];
  training: { completedWorkouts: number; minutes: number } | null;
};
export type AdviceThread = {
  id: string;
  title: string;
  snapshot: AdviceSnapshot;
  createdAt: number;
  version: number;
  exchanges: {
    id: string;
    question: string;
    answer: string;
    createdAt: number;
    position: number;
  }[];
};
