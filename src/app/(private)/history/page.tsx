import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { historyPage } from "@/lib/workouts";
export default async function History({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const raw = Number((await searchParams).page || 0);
  const page = Number.isInteger(raw) ? Math.min(100000, Math.max(0, raw)) : 0;
  const rows = historyPage(page);
  return (
    <main>
      <p className="eyebrow">Dein Tagebuch · Training</p>
      <h1>
        Dein Fortschritt.
        <br />
        Training für Training.
      </h1>
      <div className="row diary-tabs"><Link href="/diary">← Essen</Link><strong>Training</strong></div>
      {!rows.length && (
        <section className="card">
          <h2>Noch ein unbeschriebenes Blatt.</h2>
          <p className="muted">
            Abgeschlossene Workouts findest du hier. Jeder Satz ist ein Anfang.
          </p>
          <Link className="button" href="/">
            Zum Training →
          </Link>
        </section>
      )}
      {rows.map((w) => (
        <Link
          className="card history-item"
          key={w.id}
          href={`/history/${w.id}`}
        >
          <div>
            <span className="eyebrow">
              {new Date(w.finishedAt!).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Berlin",
              })}
            </span>
            <h2>{w.dayName}</h2>
            <span className="muted">
              {w.planName} ·{" "}
              {Math.max(1, Math.round((w.finishedAt! - w.startedAt) / 60000))}{" "}
              Min.
            </span>
          </div>
          <span aria-hidden="true">↗</span>
        </Link>
      ))}
      <div className="row">
        {page > 0 && (
          <Link className="button secondary" href={`/history?page=${page - 1}`}>
            ← Neuere
          </Link>
        )}
        {rows.length === 20 && (
          <Link className="button secondary" href={`/history?page=${page + 1}`}>
            Ältere →
          </Link>
        )}
      </div>
    </main>
  );
}
