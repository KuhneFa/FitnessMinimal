import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell">
      <p className="eyebrow">404 · Nicht gefunden</p>
      <h1>Hier ist kein Training.</h1>
      <p className="muted">
        Diese Seite existiert nicht oder ist nicht mehr verfügbar.
      </p>
      <Link className="button" href="/">
        Zur Startseite →
      </Link>
    </main>
  );
}
