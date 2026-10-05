"use client";
import { useEffect, useRef, useState } from "react";
import {
  assistantInputSchema,
  proposalSchema,
  type PlanProposal,
  type AssistantInput,
} from "@/lib/ai-contract";
import type { PlanInput } from "@/lib/plans";
import { VoiceInput } from "./voice-input";
import { ChatGptConnection } from "./chatgpt-connection";
import { parsePlanResponse, PlanResponseError } from "@/lib/plan-response";
type Choice = "accepted" | "rejected";
type Imported = {
  plan: PlanInput;
  exercises: { id: string; name: string; muscle: string }[];
};
type ProfileForm = {
  age: string;
  heightCm: string;
  weightKg: string;
  focus: string;
  experience: AssistantInput["profile"]["experience"];
  daysPerWeek: string;
};
const emptyProfile: ProfileForm = {
  age: "",
  heightCm: "",
  weightKg: "",
  focus: "",
  experience: "unspecified",
  daysPerWeek: "",
};
const optionalNumber = (value: string) =>
  value.trim() === "" ? null : Number(value.replace(",", "."));

export function PlanAssistant({
  hasContent,
  onApply,
}: {
  hasContent: boolean;
  onApply: (value: Imported) => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [identity, setIdentity] = useState("");
  const [prompt, setPrompt] = useState("");
  const [importText, setImportText] = useState("");
  const [exported, setExported] = useState("");
  const [wishes, setWishes] = useState("");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [busy, setBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [replace, setReplace] = useState(false);
  const [applying, setApplying] = useState(false);
  const request = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement | null>(null);
  const fingerprint = JSON.stringify({ wishes, profile, identity });
  const stale = !!proposal && submitted !== fingerprint;
  useEffect(() => () => request.current?.abort(), []);
  function inputData() {
    return assistantInputSchema.safeParse({
      wishes,
      profile: {
        age: optionalNumber(profile.age),
        heightCm: optionalNumber(profile.heightCm),
        weightKg: optionalNumber(profile.weightKg),
        focus: profile.focus,
        experience: profile.experience,
        daysPerWeek: optionalNumber(profile.daysPerWeek),
      },
    });
  }
  async function preparePrompt() {
    setError("");
    setNotice("");
    const parsed = inputData();
    if (!parsed.success) {
      setError(
        "Bitte beschreibe deine Wünsche mit 10 bis 6.000 Zeichen und prüfe die optionalen Angaben. Dein vollständiger Text bleibt im Eingabefeld erhalten.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPrompt(data.prompt);
      setExported(fingerprint);
      setImportText("");
    } catch {
      setError(
        "Die Anfrage konnte nicht vorbereitet werden. Bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }
  function importProposal() {
    setError("");
    if (!exported || exported !== fingerprint) {
      setError(
        "Deine Angaben wurden geändert. Bereite zuerst eine neue ChatGPT-Anfrage vor.",
      );
      return;
    }
    try {
      const parsed = parsePlanResponse(importText);
      setProposal(parsed);
      setChoices({});
      setSubmitted(fingerprint);
      setReplace(false);
      setImportText("");
      setPrompt("");
      setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (error) {
      setError(
        error instanceof PlanResponseError
          ? error.message
          : "Der eingefügte Vorschlag konnte nicht gelesen werden. Es wurde nichts übernommen.",
      );
    }
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const parsed = inputData();
    if (!parsed.success) {
      setError(
        "Bitte beschreibe deine Wünsche mit 10 bis 6.000 Zeichen und prüfe die optionalen Angaben. Dein vollständiger Text bleibt im Eingabefeld erhalten.",
      );
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Vorschläge konnten nicht erstellt werden.",
        );
      const checked = proposalSchema.safeParse(data);
      if (!checked.success)
        throw new Error(
          "Der Entwurf konnte nicht gelesen werden. Bitte erneut versuchen.",
        );
      setProposal(checked.data);
      setChoices({});
      setSubmitted(fingerprint);
      setReplace(false);
      setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (e) {
      setError(
        controller.signal.aborted
          ? "Die Anfrage wurde abgebrochen. Deine Angaben bleiben erhalten."
          : e instanceof TypeError
            ? "Keine Verbindung. Deine Angaben bleiben erhalten; bitte erneut versuchen."
            : e instanceof Error
              ? e.message
              : "Vorschläge konnten nicht erstellt werden.",
      );
    } finally {
      clearTimeout(timeout);
      request.current = null;
      setBusy(false);
    }
  }
  const all =
    proposal?.days.flatMap((day, di) =>
      day.exercises.map((exercise, ei) => ({ exercise, key: `${di}:${ei}` })),
    ) || [];
  const accepted = all.filter(
    (item) => choices[item.key] === "accepted",
  ).length;
  const reviewed = all.filter((item) => choices[item.key]).length;
  async function apply() {
    if (
      !proposal ||
      stale ||
      accepted === 0 ||
      reviewed !== all.length ||
      (hasContent && !replace)
    )
      return;
    setApplying(true);
    setError("");
    const selection = {
      name: proposal.name,
      days: proposal.days
        .map((day, di) => ({
          name: day.name,
          exercises: day.exercises.filter(
            (_, ei) => choices[`${di}:${ei}`] === "accepted",
          ),
        }))
        .filter((day) => day.exercises.length),
    };
    try {
      const res = await fetch("/api/ai/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Übernehmen fehlgeschlagen.");
      onApply(data);
      setProposal(null);
      setChoices({});
      setWishes("");
      setProfile(emptyProfile);
      setPrompt("");
      setImportText("");
      setExported("");
      setNotice(
        "Deine Auswahl ist im Planeditor. Prüfe die Startgewichte und speichere deinen Plan.",
      );
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Keine Verbindung. Deine Auswahl bleibt erhalten."
          : e instanceof Error
            ? e.message
            : "Übernehmen fehlgeschlagen.",
      );
    } finally {
      setApplying(false);
    }
  }
  return (
    <section className="assistant card" aria-labelledby="assistant-title">
      <div className="row">
        <span className="eyebrow">DEIN KI-PLANASSISTENT</span>
        <span className="badge">Du entscheidest</span>
      </div>
      <h2 id="assistant-title">Erzähl mir, wie du trainieren willst.</h2>
      <p className="muted">
        Deine Wunschübungen, dein Ziel, dein Rhythmus. Daraus wird ein
        Vorschlag, den du Übung für Übung bestätigst.
      </p>
      <ChatGptConnection
        disabled={busy || applying || voiceBusy}
        onChange={(connected, nextIdentity) => {
          setAvailable(connected);
          setIdentity(nextIdentity);
        }}
      />
      <VoiceInput
        disabled={busy || applying}
        onBusyChange={setVoiceBusy}
        onTranscript={(text) => {
          setWishes((old) =>
            [old.trim(), text.trim()].filter(Boolean).join("\n"),
          );
          setNotice(
            "Text erkannt. Prüfe die Angaben, bevor du Vorschläge anforderst.",
          );
        }}
      />
      <form className="stack" onSubmit={generate}>
        <fieldset
          disabled={busy || applying || voiceBusy}
          className="assistant-fields"
        >
          <label>
            Deine Trainingswünsche
            <textarea
              value={wishes}
              onChange={(e) => setWishes(e.target.value)}
              minLength={10}
              required
              rows={4}
              placeholder="Ich möchte zweimal pro Woche trainieren. Bankdrücken mit 80 kg und Klimmzüge sollen dabei sein. Mein Fokus ist Muskelaufbau, Beine möchte ich ebenfalls trainieren."
            />
          </label>
          <small className="muted">
            Du kannst alle Angaben auch direkt einsprechen oder hier eintippen.
          </small>
          {wishes.length > 6000 && (
            <p className="error" role="status">
              {wishes.length.toLocaleString("de-DE")} Zeichen: Dein vollständiger
              Text ist erhalten. Bitte kürze ihn auf höchstens 6.000 Zeichen,
              bevor du einen Vorschlag anforderst.
            </p>
          )}
          <details className="profile-details">
            <summary>Über dich & dein Training · optional</summary>
            <div className="profile-grid">
              {(
                [
                  {
                    key: "age",
                    label: "Alter in Jahren",
                    min: 1,
                    max: 120,
                    step: 1,
                  },
                  {
                    key: "heightCm",
                    label: "Größe in cm",
                    min: 50,
                    max: 250,
                    step: 0.1,
                  },
                  {
                    key: "weightKg",
                    label: "Körpergewicht in kg",
                    min: 20,
                    max: 400,
                    step: 0.1,
                  },
                ] as const
              ).map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    type="number"
                    inputMode={field.key === "age" ? "numeric" : "decimal"}
                    value={profile[field.key]}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, [field.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              <label>
                Trainingstage pro Woche
                <select
                  value={profile.daysPerWeek}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, daysPerWeek: e.target.value }))
                  }
                >
                  <option value="">Keine Angabe</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Trainingserfahrung
                <select
                  value={profile.experience}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      experience: e.target.value as ProfileForm["experience"],
                    }))
                  }
                >
                  <option value="unspecified">Keine Angabe</option>
                  <option value="beginner">Einsteiger</option>
                  <option value="intermediate">Regelmäßig trainierend</option>
                  <option value="advanced">Fortgeschritten</option>
                </select>
              </label>
              <label>
                Trainingsfokus
                <input
                  value={profile.focus}
                  maxLength={300}
                  placeholder="z. B. Muskelaufbau, Rücken, Kraft"
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, focus: e.target.value }))
                  }
                />
              </label>
            </div>
            <p className="muted voice-help">
              Freiwillig und nur für diese Anfrage. Körpergewicht ist kein
              Trainingsgewicht.
            </p>
          </details>
        </fieldset>
        <p className="assistant-privacy">
          Mit „Vorschläge erstellen“ sendest du den Text, ausgefüllte Angaben
          und die Namen deiner vorhandenen Übungen an OpenAI. FitTrack speichert
          diese Angaben nicht dauerhaft. Die Anfrage nutzt dein verbundenes
          ChatGPT-Abo. Es gibt keinen Wechsel zu einer kostenpflichtigen API.
        </p>
        <div className="row">
          <button
            disabled={available !== true || busy || applying || voiceBusy}
          >
            {busy
              ? "Dein Plan wird zusammengestellt …"
              : "Vorschläge erstellen →"}
          </button>
          {busy && (
            <button
              type="button"
              className="secondary"
              onClick={() => request.current?.abort()}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
      <details
        className="profile-details"
        open={available === false ? true : undefined}
      >
        <summary>Über ChatGPT kopieren &amp; importieren</summary>
        <div className="stack" style={{ marginTop: 16 }}>
          <p>
            Nutze dein vorhandenes Abo direkt in ChatGPT. Bereite die Anfrage
            vor, füge sie in ChatGPT ein und kopiere die Antwort zurück. Danach
            bestätigst du hier jede Übung.
          </p>
          <button
            type="button"
            className="secondary"
            disabled={busy || applying || voiceBusy}
            onClick={preparePrompt}
          >
            ChatGPT-Anfrage vorbereiten
          </button>
          {prompt && (
            <>
              <label>
                Anfrage für ChatGPT
                <textarea
                  readOnly
                  rows={5}
                  value={prompt}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(prompt);
                      setNotice("Anfrage kopiert. Füge sie in ChatGPT ein.");
                    } catch {
                      setNotice(
                        "Markiere die Anfrage oben und kopiere sie manuell.",
                      );
                    }
                  }}
                >
                  Anfrage kopieren
                </button>
                <a
                  href="https://chatgpt.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ChatGPT öffnen ↗
                </a>
              </div>
              {exported !== fingerprint && (
                <p className="error">
                  Deine Angaben wurden geändert. Bereite eine neue Anfrage vor.
                </p>
              )}
              <label>
                Antwort aus ChatGPT
                <textarea
                  value={importText}
                  maxLength={65536}
                  rows={5}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Hier die vollständige JSON-Antwort von ChatGPT einfügen …"
                />
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  applying ||
                  voiceBusy ||
                  !importText.trim() ||
                  exported !== fingerprint
                }
                onClick={importProposal}
              >
                Vorschlag prüfen
              </button>
            </>
          )}
        </div>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {proposal && (
        <div className="proposal">
          <h3 ref={resultHeading} tabIndex={-1}>
            Dein Vorschlag: {proposal.name}
          </h3>
          <p>{proposal.summary}</p>
          {proposal.notes.length > 0 && (
            <ul className="proposal-notes">
              {proposal.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
          <p className="muted">
            Gewichte ohne konkrete Angabe bleiben offen; im Editor wird dafür 0
            kg als Platzhalter eingetragen. Wähle dein Startgewicht vor dem
            ersten Training.
          </p>
          {proposal.days.map((day, di) => (
            <section key={di} aria-label={day.name}>
              <h3 className="proposal-day">{day.name}</h3>
              {day.exercises.map((exercise, ei) => {
                const key = `${di}:${ei}`;
                const choice = choices[key];
                return (
                  <article
                    className={`suggestion ${choice || ""}`}
                    key={key}
                    aria-label={`${day.name}: ${exercise.name}`}
                  >
                    <div className="row">
                      <h4>{exercise.name}</h4>
                      <span className="badge">
                        {choice === "accepted"
                          ? "Angenommen"
                          : choice === "rejected"
                            ? "Abgelehnt"
                            : exercise.muscle}
                      </span>
                    </div>
                    <p>{exercise.reason}</p>
                    <p className="suggestion-prescription">
                      {exercise.sets} Sätze · {exercise.minReps}–
                      {exercise.maxReps} Wdh. · RIR {exercise.targetRir}
                      <br />
                      {exercise.weight === null
                        ? "Startgewicht noch offen"
                        : `${exercise.weight.toLocaleString("de-DE")} kg Startgewicht`}{" "}
                      · {exercise.rest} Sek. Pause · +
                      {exercise.increment.toLocaleString("de-DE")} kg
                      Gewichtsschritt
                    </p>
                    <div className="decision-buttons">
                      <button
                        type="button"
                        className={choice === "accepted" ? "" : "secondary"}
                        aria-label={`${exercise.name} annehmen, ${day.name}`}
                        aria-pressed={choice === "accepted"}
                        disabled={applying || busy}
                        onClick={() =>
                          setChoices((old) => ({ ...old, [key]: "accepted" }))
                        }
                      >
                        ✓ Annehmen
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        aria-label={`${exercise.name} ablehnen, ${day.name}`}
                        aria-pressed={choice === "rejected"}
                        disabled={applying || busy}
                        onClick={() =>
                          setChoices((old) => ({ ...old, [key]: "rejected" }))
                        }
                      >
                        × Ablehnen
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
          <p role="status">
            {reviewed} von {all.length} geprüft · {accepted} angenommen
          </p>
          {stale && (
            <p className="assistant-info">
              Deine Angaben wurden geändert. Erstelle einen neuen Vorschlag,
              bevor du die Auswahl übernimmst.
            </p>
          )}
          {hasContent && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Meinen aktuellen Editorentwurf durch die bestätigte Auswahl
              ersetzen. Gespeichert wird erst mit „Plan speichern“.
            </label>
          )}
          <button
            type="button"
            disabled={
              applying ||
              busy ||
              voiceBusy ||
              stale ||
              accepted === 0 ||
              reviewed !== all.length ||
              (hasContent && !replace)
            }
            onClick={apply}
          >
            {applying ? "Wird übernommen …" : "Auswahl in den Plan übernehmen"}
          </button>
          <small className="muted">
            {" "}
            Entscheide für jede Übung. Abgelehnte Übungen werden nicht
            übernommen.
          </small>
        </div>
      )}
    </section>
  );
}
