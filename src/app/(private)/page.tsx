import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPlans } from "@/lib/plans";
import { activeWorkout } from "@/lib/workouts";
import { StartWorkout } from "@/components/start-workout";
export default async function Home() {
  await requireUser();
  const plans = listPlans();
  const active = activeWorkout();
  return (
    <main>
      <p className="eyebrow">Ein Satz nach dem anderen</p>
      <h1>
        Zeit für dich.
        <br />
        Zeit, stärker zu werden.
      </h1>
      <p className="muted">
        Dein Plan gibt die Richtung. Du machst den nächsten Schritt.
      </p>
      {active && (
        <section className="hero">
          <span className="badge">TRAINING LÄUFT</span>
          <h2>{active.dayName}</h2>
          <p className="muted">Deine gespeicherten Sätze warten auf dich.</p>
          <Link className="button" href={`/workout/${active.id}`}>
            Workout fortsetzen →
          </Link>
        </section>
      )}
      <div className="row" style={{ marginTop: 36 }}>
        <h2>Deine Trainingstage</h2>
        <Link href="/plans" className="muted">
          Pläne bearbeiten ↗
        </Link>
      </div>
      {plans.length === 0 ? (
        <section className="card">
          <h3>Alles beginnt mit einem Plan.</h3>
          <p className="muted">Lege deinen ersten Trainingstag an.</p>
          <Link href="/plans/new" className="button">
            Plan erstellen →
          </Link>
        </section>
      ) : (
        plans.map((p) => (
          <section key={p.id}>
            <p className="eyebrow">{p.name}</p>
            <div className="grid">
              {p.days.map((d, index) => (
                <article className="card" key={d.id}>
                  <div className="row">
                    <span className="badge">
                      TAG {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="muted">{d.exercises.length} Übungen</span>
                  </div>
                  <h2>{d.name}</h2>
                  <p className="muted">
                    {d.exercises.reduce((n, e) => n + e.sets, 0)} Sätze ·
                    Schritt für Schritt
                  </p>
                  {active ? (
                    <Link
                      href={`/workout/${active.id}`}
                      className="button secondary"
                    >
                      Laufendes Workout öffnen
                    </Link>
                  ) : (
                    <StartWorkout dayId={d.id} disabled={!d.exercises.length} />
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
