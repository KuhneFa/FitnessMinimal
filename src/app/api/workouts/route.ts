import { z } from "zod";
import { startWorkout } from "@/lib/workouts";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const { dayId } = await readJson(
      request,
      z.object({ dayId: z.string().uuid() }),
    );
    return json({ id: startWorkout(dayId) }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
