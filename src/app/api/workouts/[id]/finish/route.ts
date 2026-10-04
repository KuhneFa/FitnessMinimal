import { finishWorkout, finishSchema } from "@/lib/workouts";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    return json(
      finishWorkout((await params).id, await readJson(request, finishSchema)),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
