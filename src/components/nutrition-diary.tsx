"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  mealCategories,
  mealSchema,
  mealTotals,
  moveDate,
  type Meal,
  type MealEstimate,
} from "@/lib/nutrition-contract";
import { VoiceInput } from "./voice-input";
import { NutritionAi } from "./nutrition-ai";

export function NutritionDiary({
  date,
  entries,
}: {
  date: string;
  entries: Meal[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Meal | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Meal["category"]>("Frühstück");
  const [manualCalories, setManualCalories] = useState("");
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mutation = useRef(false);
  const draftId = useRef<string | null>(null);
  const editor = useRef<HTMLElement>(null);
  const totals = mealTotals(entries);
  const locked = voiceBusy || aiBusy || saving;
  function changeDescription(text: string) {
    setDescription(text);
    setEstimate(null);
    setManualCalories("");
    setNotice("");
  }
  function reset() {
    setEditing(null);
    setDescription("");
    setEstimate(null);
    setManualCalories("");
    draftId.current = null;
  }
  async function save() {
    if (mutation.current || locked) return;
    const kcal = manualCalories.trim() ? Number(manualCalories) : null;
    const values =
      estimate && estimate.calories !== null
        ? {
            calories: estimate.calories,
            caloriesLow: estimate.caloriesLow,
            caloriesHigh: estimate.caloriesHigh,
            assumptions: estimate.assumptions,
            source: "estimated",
          }
        : {
            calories: kcal,
            caloriesLow: kcal,
            caloriesHigh: kcal,
            assumptions: "",
            source: kcal === null ? "unknown" : "manual",
          };
    const result = mealSchema.safeParse({
      ...values,
      id: editing?.id || (draftId.current ??= crypto.randomUUID()),
      date,
      category,
      description,
      version: editing?.version || 0,
    });
    if (!result.success) {
      setError(
        "Bitte Beschreibung und Kalorien prüfen (ganze kcal zwischen 0 und 15.000).",
      );
      return;
    }
    mutation.current = true;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/nutrition/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      reset();
      setNotice("Mahlzeit im Tagebuch gespeichert.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  async function remove(entry: Meal) {
    if (
      mutation.current ||
      locked ||
      !window.confirm("Diese Mahlzeit aus dem Tagebuch löschen?")
    )
      return;
    mutation.current = true;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/nutrition/meals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, version: entry.version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (editing?.id === entry.id) reset();
      router.refresh();
      setNotice("Mahlzeit gelöscht.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  function allowDateChange(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      locked ||
      (description.trim() &&
        !window.confirm(
          "Ungespeicherten Eintrag verwerfen und den Tag wechseln?",
        ))
    )
      event.preventDefault();
  }
  return (
    <>
      <div className="row diary-tabs">
        <strong>Essen</strong>
        <Link href="/history">Training →</Link>
      </div>
      <section className="card stack">
        <div className="row">
          <Link
            href={`/diary?date=${moveDate(date, -1)}`}
            aria-label="Vorheriger Tag"
            onClick={allowDateChange}
          >
            ←
          </Link>
          <label>
            Tag
            <input
              type="date"
              value={date}
              min="2000-01-02"
              max="2100-12-30"
              disabled={locked}
              onChange={(e) => {
                if (
                  e.target.value &&
                  (!description.trim() ||
                    window.confirm(
                      "Ungespeicherten Eintrag verwerfen und den Tag wechseln?",
                    ))
                )
                  router.push(`/diary?date=${e.target.value}`);
              }}
            />
          </label>
          <Link
            href={`/diary?date=${moveDate(date, 1)}`}
            aria-label="Nächster Tag"
            onClick={allowDateChange}
          >
            →
          </Link>
        </div>
        <div>
          <p className="eyebrow">Dein Tag in Zahlen</p>
          <h2>
            {totals.calories === null
              ? "Noch keine Kalorien erfasst"
              : `${totals.estimated ? "ca. " : ""}${totals.calories.toLocaleString("de-DE")} kcal`}
          </h2>
          <p className="muted">
            {entries.length} Mahlzeiten erfasst
            {totals.unknown > 0
              ? ` · ${totals.unknown} davon ohne Kalorien`
              : ""}
            . Das ist die Summe deiner Einträge, kein vollständiger Tagesbedarf.
          </p>
          {totals.estimated && (
            <p className="muted">
              Geschätzte Spanne: {totals.low}–{totals.high} kcal für die
              Einträge mit Kalorien.
            </p>
          )}
        </div>
      </section>
      <section
        ref={editor}
        className="card stack"
        aria-labelledby="meal-editor-title"
      >
        <p className="eyebrow">Ein Moment für dich</p>
        <h2 id="meal-editor-title">
          {editing ? "Mahlzeit bearbeiten" : "Was hast du gegessen?"}
        </h2>
        <VoiceInput
          disabled={aiBusy || saving}
          onBusyChange={setVoiceBusy}
          onTranscript={(text) =>
            changeDescription(
              [description.trim(), text].filter(Boolean).join("\n"),
            )
          }
        />
        <label>
          Mahlzeit
          <select
            value={category}
            disabled={locked}
            onChange={(e) => setCategory(e.target.value as Meal["category"])}
          >
            {mealCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Was und wie viel?
          <textarea
            rows={4}
            value={description}
            disabled={locked}
            onChange={(e) => changeDescription(e.target.value)}
            placeholder="Zum Frühstück: 60 g Haferflocken, 200 ml Milch und eine Banane."
          />
        </label>
        {description.length > 6000 && (
          <p role="alert" className="error">
            Der gesamte Text ist erhalten. Bitte auf höchstens 6.000 Zeichen
            kürzen.
          </p>
        )}
        <p className="muted">
          Mengen, Zubereitung und Extras helfen bei der Schätzung. Ändert sich
          die Beschreibung, werden alte Kalorienangaben zurückgesetzt.
        </p>
        <details>
          <summary>Kalorien selbst eintragen</summary>
          <label>
            Kalorien in kcal (optional)
            <input
              type="number"
              min={0}
              max={15000}
              step={1}
              inputMode="numeric"
              disabled={locked}
              value={manualCalories}
              onChange={(e) => {
                setManualCalories(e.target.value);
                setEstimate(null);
              }}
            />
          </label>
        </details>
        <p className="assistant-privacy">
          „Kalorien schätzen“ sendet nur deine Essensbeschreibung an die
          verbundene ChatGPT-KI. Erst „Mahlzeit speichern“ legt den Eintrag
          dauerhaft in Fitmin ab. Ohne Schätzung kannst du genauso speichern.
        </p>
        <NutritionAi<{ proposal: MealEstimate }>
          endpoint="/api/nutrition/estimate"
          payload={{ description }}
          disabled={
            saving ||
            voiceBusy ||
            description.trim().length < 2 ||
            description.length > 6000
          }
          label="Kalorien schätzen"
          onBusyChange={setAiBusy}
          onResult={(data) => {
            setEstimate(data.proposal);
            setManualCalories("");
          }}
        />
        {estimate && (
          <div className="assistant-info stack" role="status">
            <h3>
              {estimate.calories === null
                ? "Für die Schätzung fehlt noch etwas"
                : `Geschätzt: ${estimate.calories} kcal`}
            </h3>
            {estimate.calories !== null && (
              <p>
                Spanne: {estimate.caloriesLow}–{estimate.caloriesHigh} kcal
              </p>
            )}
            <p>{estimate.assumptions}</p>
            {estimate.clarification && <p>{estimate.clarification}</p>}
            <small>
              Prüfe die Portionsannahmen. Du kannst die Beschreibung ergänzen
              und erneut schätzen oder eigene Kalorien eintragen.
            </small>
          </div>
        )}
        <button
          type="button"
          disabled={
            locked || description.trim().length < 2 || description.length > 6000
          }
          onClick={save}
        >
          {saving ? "Wird gespeichert …" : "Mahlzeit speichern"}
        </button>
        {editing && (
          <button
            type="button"
            className="secondary"
            disabled={locked}
            onClick={reset}
          >
            Bearbeitung abbrechen
          </button>
        )}
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
      </section>
      <section className="stack" aria-labelledby="diary-entries-title">
        <h2 id="diary-entries-title">Deine Einträge</h2>
        {!entries.length && (
          <p className="muted">
            Noch ein unbeschriebenes Blatt. Halte deine erste Mahlzeit fest.
          </p>
        )}
        {entries.map((entry) => (
          <article className="card stack" key={entry.id}>
            <div className="row">
              <h3>{entry.category}</h3>
              <span className="badge">
                {entry.calories === null
                  ? "Kalorien offen"
                  : `${entry.source === "estimated" ? "ca. " : ""}${entry.calories} kcal`}
              </span>
            </div>
            <p className="diary-text">{entry.description}</p>
            {entry.source === "estimated" && (
              <p className="muted">
                KI-Schätzung · {entry.caloriesLow}–{entry.caloriesHigh} kcal.{" "}
                {entry.assumptions}
              </p>
            )}
            {entry.source === "manual" && (
              <small className="muted">Kalorien selbst eingetragen</small>
            )}
            <div className="row">
              <button
                type="button"
                className="secondary"
                disabled={locked}
                onClick={() => {
                  if (
                    description.trim() &&
                    !window.confirm(
                      "Aktuellen ungespeicherten Entwurf verwerfen?",
                    )
                  )
                    return;
                  setEditing(entry);
                  setDescription(entry.description);
                  setCategory(entry.category);
                  setError("");
                  setNotice("");
                  setEstimate(
                    entry.source === "estimated"
                      ? {
                          calories: entry.calories,
                          caloriesLow: entry.caloriesLow,
                          caloriesHigh: entry.caloriesHigh,
                          assumptions: entry.assumptions,
                          clarification: "",
                        }
                      : null,
                  );
                  setManualCalories(
                    entry.source === "manual" ? String(entry.calories) : "",
                  );
                  editor.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Bearbeiten
              </button>
              <button
                type="button"
                className="secondary"
                disabled={locked}
                onClick={() => remove(entry)}
              >
                Löschen
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
