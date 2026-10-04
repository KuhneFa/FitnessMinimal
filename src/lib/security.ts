import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type Database from "better-sqlite3";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const COOKIE = "fittrack_session";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hex] = encoded.split(":");
  if (!salt || !hex || !/^[a-f0-9]{128}$/.test(hex)) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createSession(sqlite: Database.Database, now = Date.now()) {
  const token = randomBytes(32).toString("hex");
  sqlite.prepare("DELETE FROM sessions WHERE expires <= ?").run(now);
  sqlite
    .prepare("INSERT INTO sessions(token_hash,expires) VALUES (?,?)")
    .run(digest(token), now + SESSION_SECONDS * 1000);
  return token;
}
export function validSession(
  sqlite: Database.Database,
  token: string | undefined,
  now = Date.now(),
) {
  return (
    !!token &&
    /^[a-f0-9]{64}$/.test(token) &&
    !!sqlite
      .prepare("SELECT 1 FROM sessions WHERE token_hash = ? AND expires > ?")
      .get(digest(token), now)
  );
}
export function checkOrigin(origin: string | null) {
  const allowed =
    process.env.APP_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  return !!allowed && origin === allowed;
}
// A persistent, global login limit cannot be bypassed with forged forwarding headers.
export function consumeLoginAttempt(
  sqlite: Database.Database,
  now = Date.now(),
) {
  return sqlite.transaction(() => {
    const row = sqlite
      .prepare("SELECT count, reset FROM login_attempts WHERE key = 'global'")
      .get() as { count: number; reset: number } | undefined;
    if (!row || row.reset <= now) {
      sqlite
        .prepare(
          "INSERT OR REPLACE INTO login_attempts(key,count,reset) VALUES ('global',1,?)",
        )
        .run(now + 15 * 60 * 1000);
      return true;
    }
    if (row.count >= 10) return false;
    sqlite
      .prepare(
        "UPDATE login_attempts SET count = count + 1 WHERE key = 'global'",
      )
      .run();
    return true;
  })();
}
