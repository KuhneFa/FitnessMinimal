"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function AdviceSetup({ today }: { today: string }) {
  const router = useRouter();
  const [endDate, setEndDate] = useState(today);
  const [focus, setFocus] = useState("");
  const [includeTraining, setIncludeTraining] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const draft = useRef<{ fingerprint: string; id: string } | null>(null);
  async function prepare(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const fingerprint = JSON.stringify({ endDate, focus, includeTraining });
    if (draft.current?.fingerprint !== fingerprint)
      draft.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/advice/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.current.id,
          endDate,
          focus,
          includeTraining,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/advice/${data.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Zusammenfassung konnte nicht vorbereitet werden.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="card stack" onSubmit={prepare}>
      <p className="eyebrow">Ein Blick auf deinen Alltag</p>
      <h2>Wobei möchtest du Unterstützung?</h2>
      <p className="muted">
        Aus sieben Tagen Tagebuch entsteht eine kompakte Zusammenfassung. Du
        siehst sie zuerst und entscheidest dann, ob du sie an ChatGPT sendest.
      </p>
      <label>
        Dein Fokus (optional)
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={3}
          maxLength={600}
          disabled={busy}
          placeholder="Zum Beispiel: regelmäßiger essen und Mahlzeiten besser rund ums Training planen."
        />
      </label>
      <label>
        Sieben Tage bis einschließlich
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min="2000-01-07"
          max="2100-12-31"
          required
          disabled={busy}
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={includeTraining}
          disabled={busy}
          onChange={(e) => setIncludeTraining(e.target.checked)}
        />
        Anzahl und Dauer abgeschlossener Trainings einbeziehen
      </label>
      <small className="muted">
        Die Zusammenfassung wird in Fitmin gespeichert. Erst der nächste Schritt
        sendet sie an die KI. Einzelne Trainingssätze und Trainingsnotizen
        bleiben außen vor.
      </small>
      <button disabled={busy}>
        {busy ? "Wird vorbereitet …" : "Zusammenfassung vorbereiten"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
