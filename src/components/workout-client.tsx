"use client";
import { useEffect, useRef, useState } from "react";
import type { Workout } from "@/lib/workouts";
import { RestTimer } from "./rest-timer";
import { FinishWorkout } from "./finish-workout";
type Row = Workout["exercises"][number]["sets"][number];
type Draft = {
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
  version: number;
  mutationId: string;
  timestamp: number;
};
const KEY = "fittrack-recovery";
const draftOf = (s: Row): Draft => ({
  weight: String(s.weight),
  reps: s.reps === null ? "" : String(s.reps),
  rir: s.rir === null ? "" : String(s.rir),
  completed: s.completed,
  version: s.version,
  mutationId: crypto.randomUUID(),
  timestamp: Date.now(),
});
function numeric(value: string) {
  return value.trim() === "" ? NaN : Number(value.replace(",", "."));
}
export function WorkoutClient({ initial }: { initial: Workout }) {
  const [workout, setWorkout] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [status, setStatus] = useState("Alle Änderungen gespeichert");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<Record<string, Draft>>({});
  const inFlight = useRef(false);
  const blocked = useRef(false);
  const current = useRef(initial);
  const published = useRef<Record<string, string>>({});
  const retryAt = useRef(0);
  const failures = useRef(0);
  function persist() {
    try {
      const raw = localStorage.getItem(KEY);
      const previous = raw ? JSON.parse(raw) : null;
      const merged: Record<string, Draft> =
        previous?.workoutId === initial.id ? { ...previous.sets } : {};
      for (const [id, mutationId] of Object.entries(published.current)) {
        if (!pending.current[id] && merged[id]?.mutationId === mutationId)
          delete merged[id];
      }
      for (const [id, draft] of Object.entries(pending.current)) {
        merged[id] = draft;
        published.current[id] = draft.mutationId;
      }
      if (Object.keys(merged).length)
        localStorage.setItem(
          KEY,
          JSON.stringify({ workoutId: initial.id, sets: merged }),
        );
      else localStorage.removeItem(KEY);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  function edit(
    set: Row,
    field: keyof Pick<Draft, "weight" | "reps" | "rir" | "completed">,
    value: string | boolean,
    timestamp: number,
  ) {
    const old =
      pending.current[set.id] ||
      draftOf(
        current.current.exercises
          .flatMap((e) => e.sets)
          .find((s) => s.id === set.id)!,
      );
    pending.current[set.id] = {
      ...old,
      [field]: value,
      mutationId: crypto.randomUUID(),
      timestamp,
    };
    setDrafts({ ...pending.current });
    setStatus("Änderungen werden gespeichert …");
    persist();
  }
  const flush = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    flush.current = async () => {
      if (inFlight.current || blocked.current || Date.now() < retryAt.current)
        return;
      inFlight.current = true;
      try {
        for (const [id, draft] of Object.entries(pending.current)) {
          const weight = numeric(draft.weight),
            reps = draft.reps.trim() === "" ? null : numeric(draft.reps),
            rir = draft.rir.trim() === "" ? null : numeric(draft.rir);
          if (
            !Number.isFinite(weight) ||
            weight < 0 ||
            weight > 1000 ||
            (reps !== null &&
              (!Number.isInteger(reps) || reps < 0 || reps > 100)) ||
            (rir !== null && (!Number.isInteger(rir) || rir < 0 || rir > 10)) ||
            (draft.completed && (reps === null || reps === 0 || rir === null))
          ) {
            setStatus("Bitte kg, Wiederholungen und RIR vollständig eintragen");
            continue;
          }
          const res = await fetch(`/api/workouts/${initial.id}/sets/${id}`, {
            method: "PATCH",
            signal: AbortSignal.timeout(10000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weight,
              reps,
              rir,
              completed: draft.completed,
              version: draft.version,
              mutationId: draft.mutationId,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409 || res.status === 401) {
              blocked.current = true;
              setConflict(true);
            }
            throw new Error(data.error);
          }
          failures.current = 0;
          retryAt.current = 0;
          const saved = data as Row;
          current.current = {
            ...current.current,
            exercises: current.current.exercises.map((e) => ({
              ...e,
              sets: e.sets.map((s) => (s.id === id ? saved : s)),
            })),
          };
          setWorkout(current.current);
          if (pending.current[id]?.mutationId === draft.mutationId)
            delete pending.current[id];
          else if (pending.current[id])
            pending.current[id].version = saved.version;
          setDrafts({ ...pending.current });
          persist();
          setError("");
        }
        if (!Object.keys(pending.current).length)
          setStatus("Alle Änderungen gespeichert");
      } catch (e) {
        failures.current++;
        retryAt.current =
          Date.now() + Math.min(15000, 1000 * 2 ** failures.current);
        setStatus("Noch nicht synchronisiert");
        setError(
          e instanceof TypeError || e instanceof DOMException
            ? "Keine Verbindung. Offene Werte bleiben zur Wiederherstellung auf diesem Gerät."
            : e instanceof Error
              ? e.message
              : "Speichern fehlgeschlagen.",
        );
      } finally {
        inFlight.current = false;
      }
    };
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const recovery = JSON.parse(raw);
        if (recovery.workoutId === initial.id && initial.active === 1) {
          const ids = new Set(
            initial.exercises.flatMap((e) => e.sets.map((s) => s.id)),
          );
          for (const [id, value] of Object.entries(recovery.sets || {})) {
            const d = value as Draft;
            if (
              ids.has(id) &&
              typeof d.weight === "string" &&
              typeof d.reps === "string" &&
              typeof d.rir === "string" &&
              Number.isInteger(d.version) &&
              typeof d.completed === "boolean" &&
              typeof d.mutationId === "string"
            ) {
              pending.current[id] = d;
              published.current[id] = d.mutationId;
            }
          }
          setDrafts({ ...pending.current });
          if (Object.keys(pending.current).length)
            setStatus("Offene Werte werden wiederhergestellt …");
        } else localStorage.removeItem(KEY);
      }
    } catch {
      setStorageError(true);
    }
    const interval = setInterval(() => {
      void flush.current();
    }, 800);
    const resume = () => {
      retryAt.current = 0;
      void flush.current();
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [initial]);
  const done = workout.exercises
    .flatMap((e) => e.sets)
    .filter((s) => s.completed).length;
  const total = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <main>
      <p className="eyebrow">{workout.planName} · Aktives Training</p>
      <h1>{workout.dayName}</h1>
      <div className="row">
        <span className="badge">
          {done} / {total} Sätze
        </span>
        <span className="save-status" role="status">
          {status}
        </span>
      </div>
      <progress value={done} max={total} aria-label="Abgeschlossene Sätze" />
      {storageError && (
        <p className="error">
          Lokale Wiederherstellung ist nicht verfügbar. Lass die App offen, bis
          alle Änderungen gespeichert sind.
        </p>
      )}
      {error && (
        <section className="error" role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            onClick={() => {
              blocked.current = false;
              retryAt.current = 0;
              void flush.current();
            }}
          >
            Erneut speichern
          </button>
          {conflict && (
            <button
              className="secondary"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Offene Werte verwerfen und gespeicherte Serverwerte laden? Notiere bei Bedarf zuerst deine Eingaben.",
                  )
                )
                  return;
                try {
                  const res = await fetch(`/api/workouts/${initial.id}`);
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  pending.current = {};
                  persist();
                  setDrafts({});
                  current.current = data;
                  setWorkout(data);
                  blocked.current = false;
                  setConflict(false);
                  setError("");
                  setStatus("Serverstand geladen");
                } catch {
                  setError("Serverstand konnte nicht geladen werden.");
                }
              }}
            >
              Serverstand laden
            </button>
          )}
        </section>
      )}
      {workout.active === 1 && (
        <RestTimer workoutId={workout.id} completed={done} />
      )}
      {workout.exercises.map((exercise, index) => (
        <section className="card" key={exercise.id}>
          <div className="row">
            <span className="eyebrow">
              ÜBUNG {String(index + 1).padStart(2, "0")}
            </span>
            <span className="muted">
              {exercise.minReps}–{exercise.maxReps} Wdh. · RIR{" "}
              {exercise.targetRir}
            </span>
          </div>
          <h2>{exercise.name}</h2>
          <p className="recommendation">↗ {exercise.recommendation}</p>
          <p className="previous">
            Letztes Training:{" "}
            {exercise.previous
              ? exercise.previous.sets
                  .filter((s) => s.completed)
                  .map((s) => `${s.weight} kg × ${s.reps} (RIR ${s.rir})`)
                  .join(" · ") || "Keine abgeschlossenen Sätze"
              : "Noch kein abgeschlossenes Training"}
          </p>
          <div className="set-grid set-head">
            <span>Satz</span>
            <span>kg</span>
            <span>Wdh.</span>
            <span>RIR</span>
            <span>Fertig</span>
          </div>
          {exercise.sets.map((set, i) => {
            const d = drafts[set.id];
            const completed = d?.completed ?? set.completed;
            return (
              <div
                key={set.id}
                className={`set-grid ${completed ? "set-done" : ""}`}
              >
                <strong className="set-number">{i + 1}</strong>
                {(["weight", "reps", "rir"] as const).map((field) => (
                  <input
                    key={field}
                    aria-label={`${exercise.name}, Satz ${i + 1}, ${field === "weight" ? "Gewicht in kg" : field === "reps" ? "Wiederholungen" : "RIR"}`}
                    inputMode={field === "weight" ? "decimal" : "numeric"}
                    autoComplete="off"
                    maxLength={8}
                    value={
                      d?.[field] ??
                      (set[field] === null ? "" : String(set[field]))
                    }
                    placeholder="–"
                    disabled={workout.active !== 1}
                    onChange={(e) =>
                      edit(set, field, e.target.value, Date.now())
                    }
                  />
                ))}
                <button
                  type="button"
                  className={completed ? "complete checked" : "complete"}
                  aria-label={`${exercise.name}, Satz ${i + 1} ${completed ? "wieder öffnen" : "abschließen"}`}
                  aria-pressed={completed}
                  disabled={workout.active !== 1}
                  onClick={() => edit(set, "completed", !completed, Date.now())}
                >
                  {completed ? "✓" : "○"}
                </button>
              </div>
            );
          })}
        </section>
      ))}
      <p className="muted">
        RIR = mögliche weitere Wiederholungen. Deine Sätze werden automatisch
        auf dem Server gespeichert.
      </p>
      {workout.active === 1 && (
        <FinishWorkout
          workout={workout}
          pending={Object.keys(drafts).length > 0}
        />
      )}
    </main>
  );
}
