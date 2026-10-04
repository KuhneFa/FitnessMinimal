import { saveSet, setSchema } from "@/lib/workouts";
import { authorize, readJson, json, errorResponse } from "@/lib/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  try {
    await authorize(request);
    const { id, setId } = await params;
    return json(saveSet(id, setId, await readJson(request, setSchema)));
  } catch (e) {
    return errorResponse(e);
  }
}
