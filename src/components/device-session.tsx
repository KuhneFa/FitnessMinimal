"use client";
import { useEffect, useState } from "react";
import { activateDevice, DeviceRevokedError } from "@/lib/device-storage";

export function DeviceSession({
  sessionTag,
  children,
}: {
  sessionTag: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // Only a server-authenticated page can activate a new session. The tag is
    // one-way derived and cannot be used as an authentication credential.
    void activateDevice(sessionTag)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof DeviceRevokedError)
          window.location.replace("/login");
        else setReady(true); // Workout reports unavailable storage; online use remains possible.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionTag]);
  return ready ? (
    children
  ) : (
    <p role="status">
      Fitmin wird geöffnet …
      <noscript>
        {" "}
        Bitte JavaScript für die interaktive Trainingsansicht aktivieren.
      </noscript>
    </p>
  );
}
