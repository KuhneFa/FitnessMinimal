import { z } from "zod";
import { HttpError, readBody, readJson } from "./http";
const passwordSchema = z.object({ password: z.string().min(1).max(256) });
export const LOGIN_ERRORS = {
  invalid: "Passwort ist nicht korrekt.",
  origin:
    "Diese Adresse ist nicht als App-Adresse freigegeben. Öffne die konfigurierte Adresse oder prüfe APP_ORIGIN auf dem Server.",
  limited: "Zu viele Versuche. Bitte nach 15 Minuten erneut versuchen.",
  unconfigured: "Login noch nicht eingerichtet.",
  hash: "Der konfigurierte Passwort-Hash ist ungültig. Bitte mit npm run password:hash neu erzeugen, vollständig eintragen und den Server neu starten.",
  input: "Bitte das Passwort erneut eingeben.",
  server: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
  "unsafe-url":
    "Die alte Anmelde-URL enthielt ein Passwort und wurde bereinigt. Bitte dieses Passwort ersetzen. Melde dich anschließend über das Formular an.",
} as const;
export type LoginErrorCode = keyof typeof LOGIN_ERRORS;
export class LoginError extends HttpError {
  constructor(
    status: number,
    public code: LoginErrorCode,
  ) {
    super(status, LOGIN_ERRORS[code]);
  }
}
export function loginErrorMessage(code: unknown) {
  return typeof code === "string" && Object.hasOwn(LOGIN_ERRORS, code)
    ? LOGIN_ERRORS[code as LoginErrorCode]
    : "";
}
export function nativeLoginForm(request: Request) {
  return (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ===
    "application/x-www-form-urlencoded"
  );
}
export async function readLoginInput(request: Request) {
  if (!nativeLoginForm(request)) return readJson(request, passwordSchema, 4096);
  const body = await readBody(request, 4096);
  const form = new URLSearchParams(body.toString("utf8"));
  // No ambiguous duplicate credentials or query-string fallback.
  if (
    form.getAll("password").length !== 1 ||
    [...form.keys()].some((key) => key !== "password")
  )
    throw new LoginError(400, "input");
  const parsed = passwordSchema.safeParse({ password: form.get("password") });
  if (!parsed.success) throw new LoginError(400, "input");
  return parsed.data;
}
export function loginRedirect(code?: LoginErrorCode) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: code ? `/login?error=${code}` : "/",
      "Cache-Control": "no-store",
      "Referrer-Policy": "strict-origin",
    },
  });
}
