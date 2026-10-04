import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getWorkout } from "@/lib/workouts";
export default async function WorkoutHistory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  let w;
  try {
    w = getWorkout((await params).id);
  } catch {
    notFound();
  }
  if (w.active === 1) redirect(`/workout/${w.id}`);
  const sets = w.exercises.flatMap((e) => e.sets).filter((s) => s.completed);
  return (
    <main>
      <Link className="muted" href="/history">
        ← Alle Trainings
      </Link>
      <p className="eyebrow" style={{ marginTop: 28 }}>
        TRAINING ABGESCHLOSSEN
      </p>
      <h1>{w.dayName}</h1>
      <p className="muted">
        {new Date(w.finishedAt!).toLocaleString("de-DE", {
          timeZone: "Europe/Berlin",
        })}{" "}
        · {w.planName}
      </p>
      <section className="hero">
        <h2>Du bist drangeblieben.</h2>
        <div className="row">
          <span>{sets.length} Sätze</span>
          <span>
            {sets
              .reduce((sum, s) => sum + s.weight * (s.reps || 0), 0)
              .toLocaleString("de-DE")}{" "}
            kg Gesamtvolumen
          </span>
        </div>
        <p className="muted">
          Fatigue {w.fatigue}/5 · Performance {w.performance}/5
        </p>
      </section>
      {w.note && (
        <section className="card">
          <h3>Deine Notiz</h3>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {w.note}
          </p>
        </section>
      )}
      {w.exercises.map((e) => (
        <section className="card" key={e.id}>
          <div className="row">
            <h2>{e.name}</h2>
            <Link className="muted" href={`/exercises/${e.exerciseId}`}>
              Verlauf ↗
            </Link>
          </div>
          <table>
            <caption className="sr-only">Sätze für {e.name}</caption>
            <thead>
              <tr>
                <th>Satz</th>
                <th>kg</th>
                <th>Wdh.</th>
                <th>RIR</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {e.sets.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.weight}</td>
                  <td>{s.reps ?? "–"}</td>
                  <td>{s.rir ?? "–"}</td>
                  <td>{s.completed ? "✓" : "Offen"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
