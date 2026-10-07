import { z } from "zod";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
import { adviceSetupSchema } from "@/lib/advice-contract";
import { createAdviceThread, deleteAdviceThread } from "@/lib/advice";
export async function POST(request: Request) {
  try {
    await authorize(request);
    return json(
      createAdviceThread(await readJson(request, adviceSetupSchema)),
      201,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(
      request,
      z.object({ id: z.string().uuid(), version: z.number().int().min(0) }),
    );
    deleteAdviceThread(data.id, data.version);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
