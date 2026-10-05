import { authorize, errorResponse, json } from "@/lib/http";
import { chatGptStatus } from "@/lib/chatgpt-oauth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json(chatGptStatus());
  } catch (e) {
    return errorResponse(e);
  }
}
