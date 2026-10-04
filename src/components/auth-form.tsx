"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const password = new FormData(e.currentTarget).get("password");
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          router.replace("/");
          router.refresh();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Verbindung fehlgeschlagen.",
          );
          setBusy(false);
        }
      }}
    >
      <label>
        Dein Passwort
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy}>{busy ? "Anmelden …" : "Anmelden →"}</button>
      <small className="muted">
        Auf diesem Gerät bleibst du 30 Tage angemeldet.
      </small>
    </form>
  );
}
export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="secondary"
        onClick={async () => {
          try {
            let recovery = false;
            try {
              recovery = !!localStorage.getItem("fittrack-recovery");
            } catch {}
            if (
              recovery &&
              !window.confirm(
                "Es gibt noch nicht synchronisierte Eingaben. Beim Abmelden werden sie von diesem Gerät entfernt. Trotzdem abmelden?",
              )
            )
              return;
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (!res.ok && res.status !== 401) throw new Error();
            try {
              localStorage.removeItem("fittrack-recovery");
            } catch {}
            router.replace("/login");
            router.refresh();
          } catch {
            setError("Abmelden fehlgeschlagen. Erneut versuchen.");
          }
        }}
      >
        Abmelden
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
