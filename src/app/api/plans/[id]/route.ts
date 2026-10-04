import { planSchema, savePlan, listPlans, library } from "@/lib/plans";
import {
  authorize,
  readJson,
  errorResponse,
  json,
  HttpError,
} from "@/lib/http";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const { id } = await context.params;
    if (!listPlans().some((p) => p.id === id))
      throw new HttpError(404, "Plan nicht gefunden.");
    const data = await readJson(request, planSchema);
    const ids = new Set(library().map((x) => x.id));
    if (data.days.some((d) => d.exercises.some((e) => !ids.has(e.exerciseId))))
      throw new HttpError(400, "Übung existiert nicht.");
    savePlan(data, id);
    return json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}
