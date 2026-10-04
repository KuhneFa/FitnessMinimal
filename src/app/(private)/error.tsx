"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <p className="eyebrow">Kurz durchatmen</p>
      <h1>Das hat nicht geklappt.</h1>
      <p className="muted">
        Deine bereits gespeicherten Daten bleiben erhalten. Prüfe die Verbindung
        und versuche es erneut.
      </p>
      <div className="row">
        <button onClick={reset}>Erneut versuchen</button>
        <Link className="button secondary" href="/">
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
