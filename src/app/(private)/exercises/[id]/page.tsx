import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { library } from "@/lib/plans";
import { exerciseHistory } from "@/lib/workouts";
import { ExerciseGuide } from "@/components/exercise-guide";
export default async function ExerciseHistory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const exercise = library().find((e) => e.id === id);
  if (!exercise) notFound();
  const raw = Number((await searchParams).page || 0);
  const page = Number.isInteger(raw) ? Math.min(100000, Math.max(0, raw)) : 0;
  const rows = exerciseHistory(id, page);
  return (
    <main>
      <Link className="muted" href="/history">
        ← Historie
      </Link>
      <p className="eyebrow" style={{ marginTop: 28 }}>
        Übungsverlauf · {exercise.muscle}
      </p>
      <h1>{exercise.name}</h1>
      <ExerciseGuide
        name={exercise.name}
        instructions={exercise.instructions}
        expanded
      />
      <p className="muted">
        Deine letzten Arbeitssätze, Training für Training.
      </p>
      {!rows.length && (
        <section className="card">
          Noch keine abgeschlossenen Trainings mit dieser Übung.
        </section>
      )}
      {rows.map((r) => (
        <section className="card" key={r.exercise.id}>
          <div className="row">
            <h3>
              {new Date(r.workout.finishedAt!).toLocaleDateString("de-DE", {
                timeZone: "Europe/Berlin",
              })}
            </h3>
            <Link className="muted" href={`/history/${r.workout.id}`}>
              {r.workout.dayName} ↗
            </Link>
          </div>
          {r.sets.map((s, i) => (
            <p className="row" key={s.id}>
              <span className="muted">Satz {i + 1}</span>
              <strong>
                {s.completed
                  ? `${s.weight} kg × ${s.reps} · RIR ${s.rir}`
                  : "Nicht absolviert"}
              </strong>
            </p>
          ))}
        </section>
      ))}
      <div className="row">
        {page > 0 && (
          <Link className="button secondary" href={`?page=${page - 1}`}>
            ← Neuere
          </Link>
        )}
        {rows.length === 20 && (
          <Link className="button secondary" href={`?page=${page + 1}`}>
            Ältere →
          </Link>
        )}
      </div>
    </main>
  );
}
