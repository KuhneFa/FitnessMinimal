import { authorize, errorResponse, json, readJson } from "@/lib/http";
import { assistantInputSchema } from "@/lib/ai-contract";
import { library } from "@/lib/plans";
import { manualPlanPrompt } from "@/lib/plan-prompt";
export async function POST(request: Request) {
  try {
    await authorize(request);
    return json({
      prompt: manualPlanPrompt(
        await readJson(request, assistantInputSchema),
        library(),
      ),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
