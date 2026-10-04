import { z } from "zod";
import { readTimer, updateTimer } from "@/lib/workout-timer";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    return json({ ...readTimer((await params).id), serverNow: Date.now() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const body = await readJson(
      request,
      z.object({
        action: z.enum(["pause", "resume", "skip", "add30"]),
        version: z.number().int().min(0),
      }),
    );
    return json({
      ...updateTimer((await params).id, body.action, body.version),
      serverNow: Date.now(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
