"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Workout } from "@/lib/workouts";
export function FinishWorkout({
  workout,
  pending,
}: {
  workout: Workout;
  pending: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sets = workout.exercises.flatMap((e) => e.sets);
  const open = sets.filter((s) => !s.completed).length;
  return (
    <section className="card">
      <p className="eyebrow">Dein Check-out</p>
      <h2>Training geschafft?</h2>
      <p className="muted">Nimm dir einen Moment. Wie hat es sich angefühlt?</p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const res = await fetch(`/api/workouts/${workout.id}/finish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fatigue: Number(form.get("fatigue")),
                performance: Number(form.get("performance")),
                note: form.get("note"),
                allowIncomplete: form.get("allowIncomplete") === "on",
                versions: Object.fromEntries(
                  sets.map((s) => [s.id, s.version]),
                ),
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            try {
              localStorage.removeItem("fittrack-recovery");
            } catch {}
            router.push(`/history/${workout.id}`);
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Abschluss fehlgeschlagen. Dein Workout bleibt gespeichert.",
            );
            setBusy(false);
          }
        }}
      >
        <label>
          Fatigue · Wie erschöpft bist du?
          <select name="fatigue" defaultValue="3">
            <option value="1">1 · Frisch</option>
            <option value="2">2 · Leicht ermüdet</option>
            <option value="3">3 · Normal erschöpft</option>
            <option value="4">4 · Stark erschöpft</option>
            <option value="5">5 · Völlig erschöpft</option>
          </select>
        </label>
        <label>
          Performance · Wie lief dein Training?
          <select name="performance" defaultValue="3">
            <option value="1">1 · Deutlich schwächer</option>
            <option value="2">2 · Etwas schwächer</option>
            <option value="3">3 · Wie erwartet</option>
            <option value="4">4 · Gut</option>
            <option value="5">5 · Sehr stark</option>
          </select>
        </label>
        <label>
          Deine Notiz · optional
          <textarea
            name="note"
            maxLength={2000}
            placeholder="Was möchtest du dir fürs nächste Mal merken?"
          />
        </label>
        {open > 0 && (
          <label className="checkbox">
            <input type="checkbox" name="allowIncomplete" required />
            Mit {open} offenen Sätzen beenden. Diese bleiben als nicht
            absolviert markiert.
          </label>
        )}
        {pending && (
          <p role="status">Bitte warten, bis alle Sätze synchronisiert sind.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || pending || sets.every((s) => !s.completed)}>
          {busy ? "Wird abgeschlossen …" : "Workout beenden ✓"}
        </button>
      </form>
    </section>
  );
}
