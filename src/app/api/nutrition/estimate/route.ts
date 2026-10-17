import { getDatabase } from "@/db";
import { authorize, readJson, json } from "@/lib/http";
import { estimateRequestSchema } from "@/lib/nutrition-contract";
import {
  mealRequest,
  manualNutritionPrompt,
  mealExample,
} from "@/lib/nutrition-prompt";
import { consumeAiBudget } from "@/lib/ai-budget";
import { PlanGenerationError } from "@/lib/openai";
import { requestStructured, aiErrorResponse } from "@/lib/ai-provider";
import { modelReply } from "@/lib/plan-response";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(request, estimateRequestSchema, 96000);
    const spec = mealRequest(data.description);
    if (data.mode === "prompt")
      return json({ prompt: manualNutritionPrompt(spec, mealExample) });
    if (data.mode === "import") {
      const reply = modelReply(data.reply || "", "imported");
      try {
        return json({ proposal: spec.parse(data.reply || ""), reply });
      } catch (e) {
        throw new PlanGenerationError(
          422,
          e instanceof Error ? e.message : "Ungültige Antwort.",
          reply,
        );
      }
    }
    return json(
      await requestStructured(spec, () =>
        consumeAiBudget(getDatabase().sqlite, "plan"),
      ),
    );
  } catch (e) {
    return aiErrorResponse(e);
  }
}
