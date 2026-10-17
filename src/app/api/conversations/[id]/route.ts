import { authorize, json, errorResponse } from "@/lib/http";
import { getConversation, deleteConversation } from "@/lib/conversations";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await authorize(request);
    return json(getConversation((await context.params).id));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await authorize(request);
    deleteConversation((await context.params).id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
