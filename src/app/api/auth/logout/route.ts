import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import { COOKIE, digest } from "@/lib/security";
import { authorize, errorResponse, json } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token)
      getDatabase()
        .sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .run(digest(token));
    jar.delete(COOKIE);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
