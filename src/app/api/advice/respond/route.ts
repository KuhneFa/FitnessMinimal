import { getDatabase } from "@/db";
import { authorize, readJson, json } from "@/lib/http";
import { adviceActionSchema } from "@/lib/advice-contract";
import {
  assertAdviceVersion,
  getAdviceThread,
  saveAdviceExchange,
} from "@/lib/advice";
import { adviceRequest } from "@/lib/advice-prompt";
import { manualNutritionPrompt } from "@/lib/nutrition-prompt";
import { consumeAiBudget } from "@/lib/ai-budget";
import { PlanGenerationError } from "@/lib/openai";
import { requestStructured, aiErrorResponse } from "@/lib/ai-provider";
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
      generated = await requestStructured(spec, () =>
        consumeAiBudget(getDatabase().sqlite, "plan"),
      );
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
    return aiErrorResponse(e);
  }
}
