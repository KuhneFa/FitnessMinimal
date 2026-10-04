export default function Loading() {
  return (
    <main aria-busy="true">
      <p className="eyebrow">Einen Moment</p>
      <h1>Dein Training lädt.</h1>
      <div className="card skeleton" style={{ height: 180 }} />
      <div className="card skeleton" style={{ height: 240 }} />
      <p role="status" className="muted">
        Gespeicherte Daten werden geladen …
      </p>
    </main>
  );
}
