import { authorize, readJson, json, errorResponse } from "@/lib/http";
import {
  createConversation,
  createConversationSchema,
} from "@/lib/conversations";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    return json(
      createConversation(await readJson(request, createConversationSchema)),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
