"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdviceThread } from "@/lib/advice-contract";
import { NutritionAi } from "./nutrition-ai";
import { VoiceInput } from "./voice-input";
export function AdviceConversation({ initial }: { initial: AdviceThread }) {
  const router = useRouter();
  const [thread, setThread] = useState(initial);
  const [question, setQuestion] = useState(
    initial.exchanges.length
      ? ""
      : "Was fällt dir bei meinen erfassten Mahlzeiten auf und welche drei alltagstauglichen Tipps passen zu meinem Fokus?",
  );
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const snapshot = thread.snapshot;
  return (
    <>
      <section className="card stack">
        <p className="eyebrow">Deine Gesprächsgrundlage</p>
        <h2>{thread.title}</h2>
        <p>
          {snapshot.from} bis {snapshot.to} · sieben Tage
        </p>
        <p className="muted">
          Diese Zusammenfassung bleibt für Rückfragen unverändert. Neue oder
          korrigierte Tagebucheinträge fließen erst in eine neue Beratung ein.
        </p>
        <details
          open={thread.exchanges.length === 0 ? true : undefined}
          className="advice-summary"
        >
          <summary>Zusammenfassung ansehen</summary>
          <div className="stack">
            {snapshot.focus && (
              <p>
                <strong>Dein Fokus:</strong> {snapshot.focus}
              </p>
            )}
            <p className="muted">{snapshot.note}</p>
            {snapshot.days.map((day) => (
              <div className="advice-day" key={day.date}>
                <h3>{day.date}</h3>
                <p>
                  {day.meals} Mahlzeiten ·{" "}
                  {day.loggedCalories === null
                    ? "Kalorien unbekannt"
                    : `${day.estimates ? "ca. " : ""}${day.loggedCalories} kcal erfasst`}
                  {day.unknownCalories > 0
                    ? ` · ${day.unknownCalories} ohne Kalorien`
                    : ""}
                </p>
                {day.estimates && (
                  <small>
                    Spanne der erfassten Werte: {day.low}–{day.high} kcal
                  </small>
                )}
                {day.entries.map((entry, i) => (
                  <p key={i} className="diary-text">
                    <strong>{entry.meal}:</strong> {entry.description}
                    <br />
                    <small>
                      {entry.calories === null
                        ? "Kalorien offen"
                        : `${entry.calories} kcal · ${entry.source === "estimated" ? "KI-Schätzung" : "selbst eingetragen"}`}
                      {entry.assumptions
                        ? ` · Annahmen: ${entry.assumptions}`
                        : ""}
                    </small>
                  </p>
                ))}
                {day.omittedDescriptions > 0 && (
                  <small>
                    {day.omittedDescriptions} weitere Beschreibungen
                    ausgelassen; ihre erfassten Kalorien sind in der Summe
                    enthalten.
                  </small>
                )}
              </div>
            ))}
            {snapshot.training && (
              <p>
                <strong>Training:</strong> {snapshot.training.completedWorkouts}{" "}
                abgeschlossene Workouts, insgesamt {snapshot.training.minutes}{" "}
                Minuten. Daraus werden keine verbrauchten Kalorien abgeleitet.
              </p>
            )}
          </div>
        </details>
        <Link href="/advice" className="button secondary">
          Neue Beratung vorbereiten
        </Link>
      </section>
      {thread.exchanges.length > 0 && (
        <section className="stack" aria-label="Dein Beratungsgespräch">
          {thread.exchanges.map((exchange) => (
            <article className="card stack" key={exchange.id}>
              <p className="eyebrow">Du</p>
              <p className="diary-text">{exchange.question}</p>
              <p className="eyebrow">Dein KI-Feedback</p>
              <p className="diary-text">{exchange.answer}</p>
            </article>
          ))}
        </section>
      )}
      <section className="card stack">
        <h2>
          {thread.exchanges.length ? "Frag weiter." : "Deine Frage an die KI."}
        </h2>
        <p className="muted">
          Alltagstipps zur Ernährung, keine medizinische Beratung. Die KI kann
          Schätzungen und Einträge falsch einordnen.
        </p>
        {thread.version < 6 ? (
          <>
            <VoiceInput
              disabled={busy || deleting}
              onBusyChange={setVoiceBusy}
              onTranscript={(text) =>
                setQuestion((old) =>
                  [old.trim(), text].filter(Boolean).join("\n"),
                )
              }
            />
            <label htmlFor="advice-question">Deine Frage</label>
            <textarea
              id="advice-question"
              rows={4}
              value={question}
              disabled={busy || voiceBusy || deleting}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {question.length > 2000 && (
              <p role="alert" className="error">
                Dein vollständiger Text ist erhalten. Bitte die Frage auf
                höchstens 2.000 Zeichen kürzen.
              </p>
            )}
            <p className="assistant-privacy">
              Mit „Feedback anfordern“ sendest du die oben sichtbare
              Zusammenfassung, diese Frage und die bisherigen Fragen und
              Antworten dieses Gesprächs an ChatGPT. Gültiges Feedback wird
              zusammen mit deiner Frage in Fitmin gespeichert. Kein
              kostenpflichtiger API-Fallback.
            </p>
            <NutritionAi<{ thread: AdviceThread }>
              endpoint="/api/advice/respond"
              payload={{ id: thread.id, version: thread.version, question }}
              disabled={
                voiceBusy ||
                deleting ||
                question.trim().length < 2 ||
                question.length > 2000
              }
              label="Feedback anfordern"
              onBusyChange={setBusy}
              onResult={(data) => {
                setThread(data.thread);
                setQuestion("");
                router.refresh();
              }}
            />
            <small className="muted">
              {thread.version} von 6 Antworten in diesem Gespräch. Danach kannst
              du mit einer neuen Zusammenfassung fortfahren.
            </small>
          </>
        ) : (
          <p>
            Sechs Antworten sind gespeichert. Starte für weitere Fragen eine
            neue Beratung mit einer aktuellen Zusammenfassung.
          </p>
        )}
      </section>
      <div className="stack">
        <button
          className="secondary"
          type="button"
          disabled={busy || voiceBusy || deleting}
          onClick={async () => {
            if (
              !window.confirm(
                "Dieses Gespräch samt gespeicherter Zusammenfassung und Antworten aus Fitmin löschen?",
              )
            )
              return;
            setDeleting(true);
            setError("");
            try {
              const res = await fetch("/api/advice/threads", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: thread.id,
                  version: thread.version,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              router.push("/advice");
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Löschen fehlgeschlagen.",
              );
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Wird gelöscht …" : "Gespräch aus Fitmin löschen"}
        </button>
        <small className="muted">
          Das Löschen entfernt keine bereits an ChatGPT gesendeten Inhalte beim
          Anbieter. Zusammenfassung und Gespräch enthalten Kopien der Angaben
          zum Zeitpunkt der Vorbereitung.
        </small>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
