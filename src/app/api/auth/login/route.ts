import { cookies } from "next/headers";
import { getDatabase } from "@/db";
import {
  checkOrigin,
  consumeLoginAttempt,
  verifyPassword,
  isPasswordHash,
  createSession,
  COOKIE,
  SESSION_SECONDS,
} from "@/lib/security";
import { HttpError, errorResponse, json } from "@/lib/http";
import {
  LoginError,
  nativeLoginForm,
  readLoginInput,
  loginRedirect,
} from "@/lib/login";
export async function POST(request: Request) {
  const native = nativeLoginForm(request);
  try {
    if (!checkOrigin(request.headers.get("origin")))
      throw new LoginError(403, "origin");
    const { sqlite } = getDatabase();
    if (!consumeLoginAttempt(sqlite)) throw new LoginError(429, "limited");
    const { password } = await readLoginInput(request);
    const hash = process.env.PASSWORD_HASH;
    if (!hash) throw new LoginError(503, "unconfigured");
    if (!isPasswordHash(hash)) throw new LoginError(503, "hash");
    if (!verifyPassword(password, hash)) throw new LoginError(401, "invalid");
    const token = createSession(sqlite);
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return native ? loginRedirect() : json({ ok: true });
  } catch (e) {
    if (native)
      return loginRedirect(
        e instanceof LoginError
          ? e.code
          : e instanceof HttpError && e.status < 500
            ? "input"
            : "server",
      );
    return errorResponse(e);
  }
}
