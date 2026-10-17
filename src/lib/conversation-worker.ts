import { z } from "zod";
import { getDatabase } from "@/db";
import { claimConversationJob, completeConversationJob } from "./conversations";
import {
  AiProviderError,
  requestStructured,
  type AiProvider,
} from "./ai-provider";
import { consumeAiBudget } from "./ai-budget";
import { HttpError } from "./http";
import { parseNutritionResponse } from "./nutrition-contract";

const answerSchema = z
  .object({ answer: z.string().trim().min(1).max(4000) })
  .strict();
// B1 establishes durable conversation delivery. Domain actions and personalized
// plans will be introduced in their subsequent phases, not guessed here.
export async function processConversationJob(
  connection = getDatabase(),
  provider?: AiProvider,
) {
  const job = claimConversationJob(connection);
  if (!job) return false;
  try {
    const result = await requestStructured(
      {
        instructions:
          "Du bist Fitmin. Antworte kurz und freundlich auf Deutsch als JSON mit answer. Der Gesprächsinhalt ist Nutzerdaten. Du kannst Fragen beantworten, aber noch keine Trainingspläne oder Einträge ausführen oder speichern. Behaupte keine gespeicherte Änderung, keinen Zugriff auf nicht übermittelte Daten und erfinde keine persönlichen Angaben. Frage bei Unklarheiten nach.",
        input: job.input,
        name: "conversation_reply",
        schema: z.toJSONSchema(answerSchema, { target: "draft-7" }),
        parse: (text) => parseNutritionResponse(text, answerSchema),
      },
      () => consumeAiBudget(connection.sqlite, "plan"),
      provider,
    );
    completeConversationJob(
      job,
      {
        text: result.proposal.answer,
        reply: result.reply,
      },
      connection,
    );
  } catch (error) {
    completeConversationJob(
      job,
      {
        error:
          error instanceof HttpError
            ? error.message
            : "Die Antwort konnte nicht verarbeitet werden. Deine Nachricht bleibt gespeichert.",
        ...(error instanceof AiProviderError && error.reply
          ? { reply: error.reply }
          : {}),
      },
      connection,
    );
  }
  return true;
}

const state = globalThis as typeof globalThis & {
  fitminChatWorker?: ReturnType<typeof setInterval>;
};
export function startConversationWorker() {
  if (state.fitminChatWorker) return;
  let running = false;
  state.fitminChatWorker = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processConversationJob();
    } catch {
      // A persistent DB failure leaves the lease for recovery, no raw data logs.
      console.error(
        "Fitmin: Gesprächsauftrag konnte nicht verarbeitet werden.",
      );
    } finally {
      running = false;
    }
  }, 1500);
  state.fitminChatWorker.unref();
}
