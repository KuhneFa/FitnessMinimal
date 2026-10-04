import { planSchema, listPlans, savePlan, library } from "@/lib/plans";
import {
  authorize,
  readJson,
  errorResponse,
  json,
  HttpError,
} from "@/lib/http";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json(listPlans());
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(request, planSchema);
    const ids = new Set(library().map((x) => x.id));
    if (data.days.some((d) => d.exercises.some((e) => !ids.has(e.exerciseId))))
      throw new HttpError(400, "Übung existiert nicht.");
    return json({ id: savePlan(data) }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
