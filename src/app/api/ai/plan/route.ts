import { getDatabase } from "@/db";
import { authorize, readJson, json } from "@/lib/http";
import { assistantInputSchema } from "@/lib/ai-contract";
import { consumeAiBudget } from "@/lib/ai-budget";
import { requestStructured, aiErrorResponse } from "@/lib/ai-provider";
import {
  planInstructions,
  planRequest,
  planJsonSchema,
} from "@/lib/plan-prompt";
import { parsePlanResponse } from "@/lib/plan-response";
import { library } from "@/lib/plans";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(request, assistantInputSchema);
    return json(
      await requestStructured(
        {
          instructions: planInstructions,
          input: planRequest(data, library()),
          name: "training_plan",
          schema: planJsonSchema(),
          parse: parsePlanResponse,
        },
        () => consumeAiBudget(getDatabase().sqlite, "plan"),
      ),
    );
  } catch (e) {
    return aiErrorResponse(e);
  }
}
