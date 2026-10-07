"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanInput } from "@/lib/plans";
import { PlanAssistant } from "./plan-assistant";
import { ExerciseGuide } from "./exercise-guide";
type Exercise = {
  id: string;
  name: string;
  muscle: string;
  instructions: string;
};
const defaults = {
  sets: 3,
  minReps: 8,
  maxReps: 10,
  targetRir: 2,
  weight: 20,
  increment: 2.5,
  rest: 120,
};
export function PlanEditor({
  initial,
  id,
  exercises: initialExercises,
}: {
  initial?: PlanInput;
  id?: string;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanInput>(
    initial || { name: "", days: [{ name: "Tag A", exercises: [] }] },
  );
  const [exercises, setExercises] = useState(initialExercises);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function update(fn: (draft: PlanInput) => void) {
    setPlan((p) => {
      const copy = structuredClone(p);
      fn(copy);
      return copy;
    });
  }
  return (
    <>
      <PlanAssistant
        exerciseLibrary={exercises}
        hasContent={
          !!plan.name.trim() ||
          plan.days.some(
            (day) => day.exercises.length > 0 || day.name !== "Tag A",
          ) ||
          plan.days.length > 1
        }
        onApply={({ plan: nextPlan, exercises: nextExercises }) => {
          setPlan(nextPlan);
          setExercises((old) => [
            ...new Map(
              [...old, ...nextExercises].map((exercise) => [
                exercise.id,
                exercise,
              ]),
            ).values(),
          ]);
          setError("");
        }}
      />
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const res = await fetch(id ? `/api/plans/${id}` : "/api/plans", {
              method: id ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(plan),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push("/plans");
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Planname
          <input
            required
            maxLength={80}
            placeholder="z. B. Upper / Lower"
            value={plan.name}
            onChange={(e) =>
              update((p) => {
                p.name = e.target.value;
              })
            }
          />
        </label>
        {plan.days.map((day, di) => (
          <section className="card stack" key={di}>
            <div className="row">
              <h2>Trainingstag {di + 1}</h2>
              {plan.days.length > 1 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    update((p) => {
                      p.days.splice(di, 1);
                    })
                  }
                >
                  Tag entfernen
                </button>
              )}
            </div>
            <label>
              Name
              <input
                required
                maxLength={80}
                value={day.name}
                onChange={(e) =>
                  update((p) => {
                    p.days[di].name = e.target.value;
                  })
                }
              />
            </label>
            {day.exercises.map((item, ei) => (
              <div className="assignment stack" key={ei}>
                <div className="row">
                  <strong>
                    {exercises.find((e) => e.id === item.exerciseId)?.name}
                  </strong>
                  <button
                    type="button"
                    className="secondary"
                    aria-label="Übung entfernen"
                    onClick={() =>
                      update((p) => {
                        p.days[di].exercises.splice(ei, 1);
                      })
                    }
                  >
                    Entfernen
                  </button>
                </div>
                <ExerciseGuide
                  name={
                    exercises.find((e) => e.id === item.exerciseId)?.name ||
                    "Übung"
                  }
                  instructions={
                    exercises.find((e) => e.id === item.exerciseId)
                      ?.instructions
                  }
                />
                <div className="config-grid">
                  {(
                    [
                      { key: "sets", label: "Sätze", min: 1, max: 10 },
                      { key: "minReps", label: "Wdh. von", min: 1, max: 50 },
                      { key: "maxReps", label: "Wdh. bis", min: 1, max: 50 },
                      { key: "targetRir", label: "Ziel-RIR", min: 0, max: 10 },
                      {
                        key: "weight",
                        label: "Start kg",
                        min: 0,
                        max: 1000,
                        step: 0.1,
                      },
                      {
                        key: "increment",
                        label: "Schritt kg",
                        min: 0.1,
                        max: 50,
                        step: 0.1,
                      },
                      { key: "rest", label: "Pause Sek.", min: 0, max: 900 },
                    ] as const
                  ).map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        type="number"
                        inputMode={
                          field.key === "weight" || field.key === "increment"
                            ? "decimal"
                            : "numeric"
                        }
                        required
                        min={field.min}
                        max={field.max}
                        step={"step" in field ? field.step : 1}
                        value={item[field.key]}
                        onChange={(e) =>
                          update((p) => {
                            p.days[di].exercises[ei][field.key] = Number(
                              e.target.value,
                            );
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <label>
              Übung hinzufügen
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    update((p) => {
                      p.days[di].exercises.push({
                        exerciseId: e.target.value,
                        ...defaults,
                      });
                    });
                }}
              >
                <option value="">Übung auswählen …</option>
                {exercises
                  .filter(
                    (e) => !day.exercises.some((i) => i.exerciseId === e.id),
                  )
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>
          </section>
        ))}
        <button
          type="button"
          className="secondary"
          disabled={plan.days.length >= 14}
          onClick={() =>
            update((p) => {
              p.days.push({ name: `Tag ${p.days.length + 1}`, exercises: [] });
            })
          }
        >
          + Trainingstag
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy}>
          {busy ? "Speichern …" : "Plan speichern"}
        </button>
      </form>
      <details className="card">
        <summary>Neue Übung anlegen</summary>
        <form
          className="stack"
          style={{ marginTop: 20 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = new FormData(form);
            setError("");
            try {
              const res = await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: values.get("name"),
                  muscle: values.get("muscle"),
                  instructions: values.get("instructions"),
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              setExercises((x) => [...x, data]);
              form.reset();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Verbindung fehlgeschlagen.",
              );
            }
          }}
        >
          <label>
            Übungsname
            <input name="name" required maxLength={80} />
          </label>
          <label>
            Muskelgruppe
            <input name="muscle" maxLength={50} />
          </label>
          <label>
            Kurzbeschreibung (optional)
            <textarea
              name="instructions"
              maxLength={600}
              rows={3}
              placeholder="Ausgangsposition, Bewegung und ein wichtiger Technikhinweis …"
            />
          </label>
          <button>Übung anlegen</button>
        </form>
      </details>
    </>
  );
}
