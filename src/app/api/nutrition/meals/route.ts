import { z } from "zod";
import {
  authorize,
  readJson,
  json,
  errorResponse,
  HttpError,
} from "@/lib/http";
import { dateSchema, mealSchema, todayDate } from "@/lib/nutrition-contract";
import { diary, saveMeal, deleteMeal } from "@/lib/nutrition";
export async function GET(request: Request) {
  try {
    await authorize(request);
    const date = dateSchema.safeParse(
      new URL(request.url).searchParams.get("date") || todayDate(),
    );
    if (!date.success)
      throw new HttpError(400, "Bitte ein gültiges Datum wählen.");
    return json(diary(date.data));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await authorize(request);
    return json(saveMeal(await readJson(request, mealSchema)));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    await authorize(request);
    const data = await readJson(
      request,
      z.object({ id: z.string().uuid(), version: z.number().int().min(1) }),
    );
    deleteMeal(data.id, data.version);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
