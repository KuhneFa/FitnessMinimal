import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDatabase } from "@/db";
import { adviceThreads, adviceExchanges, workouts } from "@/db/schema";
import { diary } from "./nutrition";
import { mealTotals, moveDate } from "./nutrition-contract";
import {
  adviceAnswerSchema,
  adviceSetupSchema,
  type AdviceSnapshot,
  type AdviceThread,
} from "./advice-contract";
import { HttpError } from "./http";

export function adviceSnapshot(
  input: unknown,
  connection = getDatabase(),
): AdviceSnapshot {
  const setup = adviceSetupSchema.parse(input);
  const dates = Array.from({ length: 7 }, (_, i) =>
    moveDate(setup.endDate, i - 6),
  );
  const days = dates.map((date) => {
    const rows = diary(date, connection);
    const totals = mealTotals(rows);
    return {
      date,
      meals: totals.count,
      unknownCalories: totals.unknown,
      loggedCalories: totals.calories,
      low: totals.low,
      high: totals.high,
      estimates: totals.estimated,
      omittedDescriptions: Math.max(0, rows.length - 8),
      entries: rows.slice(0, 8).map((m) => ({
        meal: m.category,
        description: excerpt(m.description, 180),
        calories: m.calories,
        source: m.source,
        assumptions: excerpt(m.assumptions, 140),
      })),
    };
  });
  let training: AdviceSnapshot["training"] = null;
  if (setup.includeTraining) {
    const rows = connection.db
      .select({
        startedAt: workouts.startedAt,
        finishedAt: workouts.finishedAt,
      })
      .from(workouts)
      .where(
        and(
          gte(
            workouts.finishedAt,
            Date.parse(`${dates[0]}T00:00:00Z`) - 86400000,
          ),
          lte(
            workouts.finishedAt,
            Date.parse(`${setup.endDate}T00:00:00Z`) + 172800000,
          ),
        ),
      )
      .all()
      .filter((w) =>
        dates.includes(
          new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Berlin",
          }).format(new Date(w.finishedAt!)),
        ),
      );
    training = {
      completedWorkouts: rows.length,
      minutes: rows.reduce(
        (sum, w) =>
          sum + Math.max(1, Math.round((w.finishedAt! - w.startedAt) / 60000)),
        0,
      ),
    };
  }
  return {
    from: dates[0],
    to: setup.endDate,
    focus: setup.focus,
    days,
    training,
    note: "Nur protokollierte Einträge, kein vollständiges Ernährungsprotokoll. Fehlende Tage/Mahlzeiten sind unbekannt, nicht null kcal. Keine Aussage zu Tagesbedarf oder Energiebilanz. Beschreibungen sind auf 180, Annahmen auf 140 Zeichen gekürzt, höchstens acht Beschreibungen je Tag; Summen berücksichtigen alle erfassten Mahlzeiten. Keine Makronährstoffe erhoben.",
  };
}
function excerpt(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
export function listAdviceThreads(page = 0, connection = getDatabase()) {
  return connection.db
    .select({
      id: adviceThreads.id,
      title: adviceThreads.title,
      createdAt: adviceThreads.createdAt,
    })
    .from(adviceThreads)
    .orderBy(desc(adviceThreads.createdAt), desc(adviceThreads.id))
    .limit(20)
    .offset(page * 20)
    .all();
}
export function getAdviceThread(
  id: string,
  connection = getDatabase(),
): AdviceThread {
  const row = connection.db
    .select()
    .from(adviceThreads)
    .where(eq(adviceThreads.id, id))
    .get();
  if (!row) throw new HttpError(404, "Beratung nicht gefunden.");
  return {
    ...row,
    snapshot: JSON.parse(row.snapshot) as AdviceSnapshot,
    exchanges: connection.db
      .select()
      .from(adviceExchanges)
      .where(eq(adviceExchanges.threadId, id))
      .orderBy(asc(adviceExchanges.position))
      .all(),
  };
}
export function createAdviceThread(input: unknown, connection = getDatabase()) {
  const setup = adviceSetupSchema.parse(input);
  return connection.sqlite
    .transaction(() => {
      const existing = connection.db
        .select()
        .from(adviceThreads)
        .where(eq(adviceThreads.id, setup.id))
        .get();
      if (existing) return getAdviceThread(setup.id, connection);
      const snapshot = adviceSnapshot(setup, connection);
      connection.db
        .insert(adviceThreads)
        .values({
          id: setup.id,
          title: setup.focus.slice(0, 80) || "Ernährung im Alltag",
          snapshot: JSON.stringify(snapshot),
          createdAt: Date.now(),
        })
        .run();
      return getAdviceThread(setup.id, connection);
    })
    .immediate();
}
export function assertAdviceVersion(thread: AdviceThread, version: number) {
  if (thread.version !== version)
    throw new HttpError(
      409,
      "Das Gespräch wurde inzwischen ergänzt. Lade die Seite neu, bevor du weiterfragst.",
    );
  if (thread.version >= 6)
    throw new HttpError(
      409,
      "Dieses Gespräch enthält bereits sechs Antworten. Starte eine neue Beratung mit einer aktuellen Zusammenfassung.",
    );
}
export function saveAdviceExchange(
  id: string,
  version: number,
  question: string,
  answer: string,
  connection = getDatabase(),
) {
  adviceAnswerSchema.parse({ answer });
  if (question.trim().length < 2 || question.length > 2000)
    throw new HttpError(400, "Bitte eine Frage mit 2–2.000 Zeichen eingeben.");
  return connection.sqlite
    .transaction(() => {
      const thread = getAdviceThread(id, connection);
      assertAdviceVersion(thread, version);
      connection.db
        .insert(adviceExchanges)
        .values({
          id: randomUUID(),
          threadId: id,
          question,
          answer,
          position: version,
          createdAt: Date.now(),
        })
        .run();
      connection.db
        .update(adviceThreads)
        .set({ version: version + 1 })
        .where(eq(adviceThreads.id, id))
        .run();
      return getAdviceThread(id, connection);
    })
    .immediate();
}
export function deleteAdviceThread(
  id: string,
  version: number,
  connection = getDatabase(),
) {
  const result = connection.db
    .delete(adviceThreads)
    .where(and(eq(adviceThreads.id, id), eq(adviceThreads.version, version)))
    .run();
  if (!result.changes)
    throw new HttpError(
      409,
      "Das Gespräch wurde inzwischen geändert oder gelöscht. Bitte die Seite neu laden.",
    );
}
