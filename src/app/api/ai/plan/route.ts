import { getDatabase } from "@/db";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
import { assistantInputSchema } from "@/lib/ai-contract";
import { consumeAiBudget } from "@/lib/ai-budget";
import { generateProposal, PlanGenerationError } from "@/lib/openai";
import { library } from "@/lib/plans";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(request, assistantInputSchema);
    consumeAiBudget(getDatabase().sqlite, "plan");
    return json(await generateProposal(data, library()));
  } catch (e) {
    if (e instanceof PlanGenerationError)
      return json({ error: e.message, reply: e.reply }, e.status);
    return errorResponse(e);
  }
}
