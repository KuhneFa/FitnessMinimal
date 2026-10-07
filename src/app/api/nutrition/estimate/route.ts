import { getDatabase } from "@/db";
import {
  authorize,
  readJson,
  json,
  errorResponse,
  HttpError,
} from "@/lib/http";
import { estimateRequestSchema } from "@/lib/nutrition-contract";
import {
  mealRequest,
  manualNutritionPrompt,
  mealExample,
} from "@/lib/nutrition-prompt";
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
    const account = await activeChatGptAccount();
    if (!account.model)
      throw new HttpError(409, "Bitte ein ChatGPT-Modell auswählen.");
    consumeAiBudget(getDatabase().sqlite, "plan");
    return json(await requestStructuredWithChatGpt(spec, account));
  } catch (e) {
    if (e instanceof PlanGenerationError)
      return json({ error: e.message, reply: e.reply }, e.status);
    return errorResponse(e);
  }
}
