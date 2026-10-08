import type Database from "better-sqlite3";
import { HttpError } from "./http";

export function consumeAiBudget(
  sqlite: Database.Database,
  kind: "plan" | "audio",
  now = Date.now(),
) {
  // Fixed keys keep storage bounded; budgets are shared across sessions and survive restarts.
  const limits = [
    {
      key: `ai:${kind}:quarter`,
      max: kind === "plan" ? 5 : 20,
      window: 15 * 60 * 1000,
    },
    {
      key: `ai:${kind}:day`,
      max: kind === "plan" ? 30 : 60,
      window: 24 * 60 * 60 * 1000,
    },
  ];
  sqlite
    .transaction(() => {
      const next = limits.map((limit) => {
        const row = sqlite
          .prepare("SELECT count, reset FROM login_attempts WHERE key = ?")
          .get(limit.key) as { count: number; reset: number } | undefined;
        if (row && row.reset > now && row.count >= limit.max)
          throw new HttpError(
            429,
            "KI-Limit erreicht. Bitte später erneut versuchen; manuell kannst du weiterarbeiten.",
          );
        return {
          key: limit.key,
          count: row && row.reset > now ? row.count + 1 : 1,
          reset: row && row.reset > now ? row.reset : now + limit.window,
        };
      });
      for (const row of next)
        sqlite
          .prepare(
            "INSERT OR REPLACE INTO login_attempts(key,count,reset) VALUES (?,?,?)",
          )
          .run(row.key, row.count, row.reset);
    })
    .immediate();
}
