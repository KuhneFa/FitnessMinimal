import { getDatabase } from "@/db";
import { authorize, json, errorResponse } from "@/lib/http";
import { consumeAiBudget } from "@/lib/ai-budget";
import { readAudio, transcribeAudio, requireOpenAiKey } from "@/lib/openai";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    requireOpenAiKey();
    consumeAiBudget(getDatabase().sqlite, "audio");
    const audio = await readAudio(request);
    try {
      return json({ text: await transcribeAudio(audio) });
    } finally {
      audio.bytes.fill(0);
    }
  } catch (e) {
    return errorResponse(e);
  }
}
