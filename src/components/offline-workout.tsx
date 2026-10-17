"use client";
import { useEffect, useState } from "react";
import { readDeviceWorkout, revokeDevice } from "@/lib/device-storage";
import type { Workout } from "@/lib/workouts";
import { WorkoutClient } from "./workout-client";

export function OfflineWorkout() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [message, setMessage] = useState(
    "Gespeichertes Training wird geladen …",
  );
  useEffect(() => {
    let cancelled = false;
    void readDeviceWorkout()
      .then((stored) => {
        if (!cancelled) {
          setWorkout(stored);
          setMessage(
            stored
              ? ""
              : "Auf diesem Gerät ist kein aktives Training verfügbar. Öffne Fitmin zunächst mit Internetverbindung.",
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            "Der Gerätespeicher ist nicht verfügbar. Bitte Fitmin mit Internetverbindung öffnen.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <>
      <p className="eyebrow">Gespeicherter Stand auf diesem Gerät</p>
      <p className="muted">
        Hier werden lokal gespeicherte Trainingsdaten angezeigt. Neue Pläne,
        Beratung und Anmeldung benötigen eine Verbindung.
      </p>
      <p>
        <button
          className="secondary"
          onClick={() => {
            // The offline shell can be served at a workout URL. Replace its
            // document/router state completely when returning to the server.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/");
          }}
        >
          Online-Ansicht öffnen
        </button>
      </p>
      {message && <p role="status">{message}</p>}
      {workout && <WorkoutClient initial={workout} />}
      <button
        className="secondary"
        onClick={async () => {
          if (
            !window.confirm(
              "Alle lokalen Trainingseingaben löschen, einschließlich noch nicht übertragener Werte? Die Server-Anmeldung bleibt bestehen.",
            )
          )
            return;
          try {
            await revokeDevice(false);
            setWorkout(null);
            setMessage(
              "Lokale Trainingsdaten gelöscht. Die Server-Anmeldung bleibt bestehen; zum vollständigen Abmelden die Online-Ansicht öffnen.",
            );
          } catch {
            setMessage(
              "Löschen fehlgeschlagen. Bitte Website-Daten in den Browser-Einstellungen entfernen.",
            );
          }
        }}
      >
        Lokale Trainingsdaten löschen
      </button>
    </>
  );
}
