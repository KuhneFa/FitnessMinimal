import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export function databasePath() {
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const target = path.resolve(
    process.env.DATABASE_PATH ||
      (volume ? path.join(volume, "fittrack.db") : "./data/fittrack.db"),
  );
  if (process.env.RAILWAY_ENVIRONMENT_ID && !volume)
    throw new Error("Railway requires a persistent volume.");
  if (volume && !target.startsWith(path.resolve(volume) + path.sep))
    throw new Error("DATABASE_PATH must be inside the Railway volume.");
  mkdirSync(path.dirname(target), { recursive: true });
  if (
    volume &&
    !(realpathSync(path.dirname(target)) + path.sep).startsWith(
      realpathSync(volume) + path.sep,
    )
  )
    throw new Error("Database directory escapes volume.");
  return target;
}
export function openDatabase(filename = databasePath()) {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db, sqlite };
}
let connection: ReturnType<typeof openDatabase> | undefined;
export function getDatabase() {
  return (connection ??= openDatabase());
}
