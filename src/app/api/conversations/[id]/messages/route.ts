import { authorize, readJson, json, errorResponse } from "@/lib/http";
import { enqueueMessage } from "@/lib/conversations";
import { messageInputSchema } from "@/lib/conversation-contract";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const result = enqueueMessage(
      (await context.params).id,
      await readJson(request, messageInputSchema),
    );
    return json(
      { ...result, workerEnabled: process.env.FITMIN_CHAT_WORKER === "1" },
      result.duplicate ? 200 : 202,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
