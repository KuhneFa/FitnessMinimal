"use client";
import { useEffect, useRef, useState } from "react";
import { remaining, type TimerState, type TimerAction } from "@/lib/timer";
export function RestTimer({
  workoutId,
  completed,
}: {
  workoutId: string;
  completed: number;
}) {
  const [timer, setTimer] = useState<TimerState>({
    timerEnd: null,
    timerRemaining: null,
    timerVersion: 0,
  });
  const [now, setNow] = useState(0);
  const offset = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/workouts/${workoutId}/timer`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setTimer(data);
          offset.current = data.serverNow - Date.now();
          setNow(data.serverNow);
        }
      } catch {
        /* Keep displayed timer; no workout data depends on it. */
      }
    };
    void load();
    const interval = setInterval(
      () => setNow(Date.now() + offset.current),
      500,
    );
    const visibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [workoutId, completed]);
  async function action(action: TimerAction) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/workouts/${workoutId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version: timer.timerVersion }),
      });
      const data = await res.json();
      if (!res.ok) {
        const latest = await fetch(`/api/workouts/${workoutId}/timer`);
        if (latest.ok) setTimer(await latest.json());
        throw new Error(data.error);
      }
      setTimer(data);
      offset.current = data.serverNow - Date.now();
      setNow(data.serverNow);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Timer konnte nicht aktualisiert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  const seconds = remaining(timer, now);
  return (
    <section className="timer" aria-label="Pausentimer">
      <div className="row">
        <div>
          <span className="eyebrow">
            {timer.timerRemaining !== null
              ? "Pause angehalten"
              : "Deine Satzpause"}
          </span>
          <p className="timer-digits">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
        </div>
        <span className="muted">
          {seconds === 0
            ? "Bereit für den nächsten Satz."
            : "Durchatmen. Kraft sammeln."}
        </span>
      </div>
      <div className="timer-actions">
        <button
          className="secondary"
          disabled={busy || seconds === 0}
          onClick={() =>
            action(timer.timerRemaining !== null ? "resume" : "pause")
          }
        >
          {timer.timerRemaining !== null ? "Weiter" : "Pause"}
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => action("add30")}
        >
          +30 Sek.
        </button>
        <button
          className="secondary"
          disabled={busy || seconds === 0}
          onClick={() => action("skip")}
        >
          Skip
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
