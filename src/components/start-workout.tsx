"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function StartWorkout({
  dayId,
  disabled = false,
}: {
  dayId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/workouts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dayId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/workout/${data.id}`);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Verbindung fehlgeschlagen.",
            );
            setBusy(false);
          }
        }}
      >
        {busy ? "Wird gestartet …" : "Training starten →"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
