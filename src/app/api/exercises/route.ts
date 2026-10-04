import { randomUUID } from "node:crypto";
import { getDatabase } from "@/db";
import { exercises } from "@/db/schema";
import { exerciseSchema, library } from "@/lib/plans";
import { authorize, readJson, errorResponse, json } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json(library());
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await authorize(request);
    const value = await readJson(request, exerciseSchema);
    const id = randomUUID();
    getDatabase()
      .db.insert(exercises)
      .values({ id, ...value })
      .run();
    return json({ id, ...value }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
