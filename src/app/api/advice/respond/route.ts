import { getDatabase } from "@/db";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
import { adviceActionSchema } from "@/lib/advice-contract";
import {
  assertAdviceVersion,
  getAdviceThread,
  saveAdviceExchange,
} from "@/lib/advice";
import { adviceRequest } from "@/lib/advice-prompt";
import { manualNutritionPrompt } from "@/lib/nutrition-prompt";
import { consumeAiBudget } from "@/lib/ai-budget";
import {
  requestStructuredWithChatGpt,
  PlanGenerationError,
} from "@/lib/openai";
import { activeChatGptAccount } from "@/lib/chatgpt-oauth";
import { modelReply } from "@/lib/plan-response";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(request, adviceActionSchema, 96000);
    const thread = getAdviceThread(data.id);
    assertAdviceVersion(thread, data.version);
    const spec = adviceRequest(thread, data.question);
    if (data.mode === "prompt")
      return json({
        prompt: manualNutritionPrompt(spec, {
          answer:
            "Dein konkretes Feedback mit Bezug auf die Einträge und die Frage.",
        }),
      });
    let generated;
    if (data.mode === "import") {
      const reply = modelReply(data.reply || "", "imported");
      try {
        generated = { proposal: spec.parse(data.reply || ""), reply };
      } catch (e) {
        throw new PlanGenerationError(
          422,
          e instanceof Error ? e.message : "Ungültige Antwort.",
          reply,
        );
      }
    } else {
      const account = await activeChatGptAccount();
      consumeAiBudget(getDatabase().sqlite, "plan");
      generated = await requestStructuredWithChatGpt(spec, account);
    }
    try {
      return json({
        thread: saveAdviceExchange(
          thread.id,
          data.version,
          data.question,
          generated.proposal.answer,
        ),
        reply: generated.reply,
      });
    } catch (e) {
      // A concurrent update must never hide the just-received public answer.
      return json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Antwort konnte nicht gespeichert werden.",
          reply: generated.reply,
        },
        409,
      );
    }
  } catch (e) {
    if (e instanceof PlanGenerationError)
      return json({ error: e.message, reply: e.reply }, e.status);
    return errorResponse(e);
  }
}
