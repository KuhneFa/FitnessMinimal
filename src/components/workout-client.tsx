"use client";
import type { Workout } from "@/lib/workouts";
import { RestTimer } from "./rest-timer";
import { FinishWorkout } from "./finish-workout";
import { ExerciseGuide } from "./exercise-guide";
import { useWorkoutRecovery } from "./use-workout-recovery";
import { OfflineAvailability } from "./offline-availability";
export function WorkoutClient({ initial }: { initial: Workout }) {
  const {
    workout,
    drafts,
    status,
    error,
    storageError,
    conflict,
    alternatives,
    ready,
    online,
    edit,
    retry,
    discard,
  } = useWorkoutRecovery(initial);
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
      <OfflineAvailability />
      {!online && (
        <p role="status">
          Offline · Sätze werden auf diesem Gerät vorgemerkt. Timer und
          Trainingsabschluss benötigen eine Verbindung.
        </p>
      )}
      {storageError && (
        <p className="error">
          Lokale Wiederherstellung ist nicht verfügbar. Lass die App offen, bis
          alle Änderungen gespeichert sind.
        </p>
      )}
      {error && (
        <section className="error" role="alert">
          <p>{error}</p>
          {alternatives.length > 0 && (
            <ul>
              {alternatives.map(({ setId, draft }) => {
                const exercise = workout.exercises.find((e) =>
                  e.sets.some((s) => s.id === setId),
                );
                const position =
                  exercise?.sets.findIndex((s) => s.id === setId) ?? -1;
                return (
                  <li key={draft.mutationId}>
                    {exercise?.name} · Satz {position + 1}: {draft.weight} kg ×{" "}
                    {draft.reps || "–"} · RIR {draft.rir || "–"}
                    {draft.completed ? " · fertig" : " · offen"}
                  </li>
                );
              })}
            </ul>
          )}
          <button
            className="secondary"
            onClick={retry}
            disabled={alternatives.length > 0}
          >
            Erneut speichern
          </button>
          {conflict && (
            <button className="secondary" onClick={discard}>
              Serverstand laden
            </button>
          )}
        </section>
      )}
      {workout.active === 1 && online && (
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
          <ExerciseGuide
            name={exercise.name}
            instructions={exercise.instructions}
          />
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
                    disabled={
                      !ready || workout.active !== 1 || alternatives.length > 0
                    }
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
                  disabled={
                    !ready || workout.active !== 1 || alternatives.length > 0
                  }
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
          pending={
            !ready || !online || conflict || Object.keys(drafts).length > 0
          }
        />
      )}
    </main>
  );
}
