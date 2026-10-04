import { z } from "zod";
import { authenticated } from "./auth";
import { checkOrigin } from "./security";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(request: Request) {
  if (!(await authenticated()))
    throw new HttpError(401, "Bitte erneut anmelden.");
  if (
    !["GET", "HEAD"].includes(request.method) &&
    !checkOrigin(request.headers.get("origin"))
  )
    throw new HttpError(403, "Anfrage nicht erlaubt.");
}
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON erwartet.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Daten fehlen.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 32768) {
      await reader.cancel();
      throw new HttpError(413, "Anfrage zu groß.");
    }
    chunks.push(value);
  }
  try {
    return schema.parse(JSON.parse(Buffer.concat(chunks).toString()));
  } catch {
    throw new HttpError(400, "Bitte Eingaben prüfen.");
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    { error: "Das hat nicht geklappt. Bitte erneut versuchen." },
    { status: 500 },
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
