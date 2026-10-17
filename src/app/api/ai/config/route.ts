import { authorize, errorResponse, json } from "@/lib/http";
import { chatGptStatus } from "@/lib/chatgpt-oauth";
import { chatGptProviderInfo } from "@/lib/ai-provider";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json({ ...chatGptStatus(), provider: chatGptProviderInfo });
  } catch (e) {
    return errorResponse(e);
  }
}
