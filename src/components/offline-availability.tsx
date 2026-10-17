"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
const subscribe = () => () => {};

export function OfflineAvailability() {
  const supported = useSyncExternalStore(
    subscribe,
    () => process.env.NODE_ENV === "production" && "serviceWorker" in navigator,
    () => null,
  );
  const [message, setMessage] = useState("Offline-Start wird vorbereitet …");
  useEffect(() => {
    let cancelled = false;
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (!cancelled)
        setMessage(
          "Offline-Start noch nicht bereit. Die App zum Vorbereiten mit Verbindung öffnen.",
        );
    }, 15000);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (!cancelled) {
          clearTimeout(timer);
          setMessage(
            "Offline-Start vorbereitet · aktives Training auf diesem Gerät wieder öffnen.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timer);
          setMessage(
            "Offline-Start nicht verfügbar. Die geöffnete Trainingsansicht bleibt nutzbar.",
          );
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return (
    <p className="muted" data-testid="offline-availability">
      {supported === false
        ? "Offline-Start benötigt HTTPS oder localhost und den Production-Build."
        : message}
    </p>
  );
}
