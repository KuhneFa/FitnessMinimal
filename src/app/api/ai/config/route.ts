import { authorize, errorResponse, json } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json({ available: !!process.env.OPENAI_API_KEY?.trim() });
  } catch (e) {
    return errorResponse(e);
  }
}
