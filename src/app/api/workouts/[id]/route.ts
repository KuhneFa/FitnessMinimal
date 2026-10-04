import { getWorkout } from "@/lib/workouts";
import { authorize, json, errorResponse } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    return json(getWorkout((await params).id));
  } catch (e) {
    return errorResponse(e);
  }
}
