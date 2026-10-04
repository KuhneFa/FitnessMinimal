import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPlans } from "@/lib/plans";
export default async function Plans() {
  await requireUser();
  const plans = listPlans();
  return (
    <main>
      <p className="eyebrow">Struktur schafft Fortschritt</p>
      <div className="row">
        <h1>Deine Pläne.</h1>
        <Link className="button" href="/plans/new">
          + Neuer Plan
        </Link>
      </div>
      {plans.length === 0 ? (
        <section className="card">
          <h2>Dein erster Schritt.</h2>
          <p className="muted">
            Lege Übungen und einen Trainingsplan an. Dein nächstes Training
            beginnt hier.
          </p>
        </section>
      ) : (
        plans.map((p) => (
          <section key={p.id} className="card">
            <div className="row">
              <h2>{p.name}</h2>
              <Link className="button secondary" href={`/plans/${p.id}`}>
                Bearbeiten
              </Link>
            </div>
            {p.days.map((d) => (
              <p className="row" key={d.id}>
                <strong>{d.name}</strong>
                <span className="muted">{d.exercises.length} Übungen</span>
              </p>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
