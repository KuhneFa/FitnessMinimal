import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import { databasePath } from "@/db";
import { HttpError } from "./http";

const accountSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  subject: z.string(),
  email: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  expiresAt: z.number().optional(),
  scopes: z.array(z.string()),
  model: z.string().optional(),
  welcomeSeen: z.boolean().optional(),
});
export type ChatGptAccount = z.infer<typeof accountSchema>;
const storeSchema = z.object({
  hostId: z.string(),
  active: z.string().nullable(),
  accounts: z.array(accountSchema),
});
export type ChatGptStore = z.infer<typeof storeSchema>;
export function localChatGptEnabled() {
  try {
    const url = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
    return (
      !process.env.RAILWAY_ENVIRONMENT_ID &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
export function requireLocalChatGpt() {
  if (!localChatGptEnabled())
    throw new HttpError(
      403,
      "Die direkte ChatGPT-Anmeldung ist hier nur lokal verfügbar. Nutze den ChatGPT-Import ohne API-Abrechnung.",
    );
}
function filename() {
  return path.join(path.dirname(databasePath()), "chatgpt-connection.json");
}
export function readChatGptStore(): ChatGptStore {
  const file = filename();
  if (!existsSync(file)) return { hostId: "", active: null, accounts: [] };
  try {
    return storeSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new HttpError(
      503,
      "Die ChatGPT-Verbindung konnte nicht gelesen werden.",
    );
  }
}
export function writeChatGptStore(store: ChatGptStore) {
  const file = filename();
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(storeSchema.parse(store)), {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temp, file);
  chmodSync(file, 0o600);
}
// One Node process, matching the application's single-instance SQLite deployment.
const state = globalThis as typeof globalThis & {
  fittrackChatGptLock?: Promise<unknown>;
};
export function withChatGptLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = (state.fittrackChatGptLock || Promise.resolve()).then(fn, fn);
  state.fittrackChatGptLock = next.catch(() => undefined);
  return next;
}
