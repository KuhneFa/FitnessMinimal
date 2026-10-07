import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAdviceThreads } from "@/lib/advice";
import { todayDate } from "@/lib/nutrition-contract";
import { AdviceSetup } from "@/components/advice-setup";
export default async function Advice({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const raw = Number((await searchParams).page || 0);
  const page = Number.isInteger(raw) ? Math.min(100000, Math.max(0, raw)) : 0;
  const threads = listAdviceThreads(page);
  return (
    <main>
      <p className="eyebrow">Verstehen. Ausprobieren. Dranbleiben.</p>
      <h1>Deine Beratung.</h1>
      <AdviceSetup today={todayDate()} />
      <section className="stack">
        <h2>Deine Gespräche</h2>
        {!threads.length && (
          <p className="muted">
            Hier bleiben deine Beratungen und Rückfragen erhalten.
          </p>
        )}
        {threads.map((thread) => (
          <Link
            className="card history-item"
            key={thread.id}
            href={`/advice/${thread.id}`}
          >
            <div>
              <p className="eyebrow">
                {new Date(thread.createdAt).toLocaleDateString("de-DE", {
                  timeZone: "Europe/Berlin",
                })}
              </p>
              <h3>{thread.title}</h3>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
        <div className="row">
          {page > 0 && (
            <Link href={`/advice?page=${page - 1}`}>← Neuere Gespräche</Link>
          )}
          {threads.length === 20 && (
            <Link href={`/advice?page=${page + 1}`}>Ältere Gespräche →</Link>
          )}
        </div>
      </section>
    </main>
  );
}
