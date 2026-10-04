import { cookies } from "next/headers";
import { z } from "zod";
import { getDatabase } from "@/db";
import {
  checkOrigin,
  consumeLoginAttempt,
  verifyPassword,
  createSession,
  COOKIE,
  SESSION_SECONDS,
} from "@/lib/security";
import { readJson, HttpError, errorResponse, json } from "@/lib/http";
export async function POST(request: Request) {
  try {
    if (!checkOrigin(request.headers.get("origin")))
      throw new HttpError(403, "Anfrage nicht erlaubt.");
    const { sqlite } = getDatabase();
    if (!consumeLoginAttempt(sqlite))
      throw new HttpError(
        429,
        "Zu viele Versuche. Bitte nach 15 Minuten erneut versuchen.",
      );
    const { password } = await readJson(
      request,
      z.object({ password: z.string().min(1).max(256) }),
    );
    const hash = process.env.PASSWORD_HASH;
    if (!hash) throw new HttpError(503, "Login noch nicht eingerichtet.");
    if (!verifyPassword(password, hash))
      throw new HttpError(401, "Passwort ist nicht korrekt.");
    const token = createSession(sqlite);
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
