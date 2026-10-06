"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Status = {
  local: boolean;
  available: boolean;
  active: string | null;
  accounts: { id: string; label: string; connected: boolean; model: string }[];
  pending: boolean;
  needsWelcome?: boolean;
  message: string;
};
export function ChatGptConnection({
  disabled,
  onChange,
}: {
  disabled: boolean;
  onChange: (available: boolean, identity: string) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState("");
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  const welcome = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    if (status?.needsWelcome) welcome.current?.showModal();
    else welcome.current?.close();
  }, [status?.needsWelcome]);
  const active = status?.accounts.find((a) => a.id === status.active);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/ai/config", { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setStatus(data);
    setSelected(data.active || "");
    const account = (data as Status).accounts.find((a) => a.id === data.active);
    callback.current(
      data.available && !!account?.model,
      `${data.active || ""}:${account?.model || ""}`,
    );
    return data as Status;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setError(
          "ChatGPT-Verbindung konnte nicht geprüft werden. Der Import bleibt nutzbar.",
        );
    });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!status?.pending) return;
    const controller = new AbortController();
    const timer = setInterval(
      () => refresh(controller.signal).catch(() => undefined),
      1500,
    );
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [status?.pending, refresh]);
  useEffect(() => {
    if (!status?.available) return;
    const controller = new AbortController();
    fetch("/api/ai/chatgpt", { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setModels(data.models);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Modelle konnten nicht geladen werden.",
          );
      });
    return () => controller.abort();
  }, [status?.active, status?.available]);
  async function action(action: string, accountId?: string, model?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/ai/chatgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, accountId, model }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.url) setUrl(data.url);
      else setUrl("");
      if (data.message) setNotice(data.message);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "ChatGPT-Verbindung fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="assistant-info stack">
      <dialog
        ref={welcome}
        className="chatgpt-welcome card"
        aria-labelledby="chatgpt-welcome-title"
        onCancel={(e) => {
          e.preventDefault();
          void action("welcome");
        }}
      >
        <h2 id="chatgpt-welcome-title">Du verwendest dein ChatGPT-Abo</h2>
        <p>
          Vorschläge in Fitmin zählen zu deiner ChatGPT-Nutzung. Bei
          erreichten Limits wird gestoppt; Fitmin verwendet keinen
          kostenpflichtigen API-Key.
        </p>
        <p>
          Verwalte die Freigabe und eventuelle Guthaben-Nutzung in den
          ChatGPT-Einstellungen.
        </p>
        <p>
          <a
            href="https://chatgpt.com/settings/usage"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nutzung verwalten ↗
          </a>
        </p>
        <button type="button" disabled={busy} onClick={() => action("welcome")}>
          Verstanden
        </button>
      </dialog>
      <strong>Mit deinem ChatGPT-Abo · ohne API-Key</strong>
      <p className="voice-help">
        Fitmin nutzt ausschließlich deine freigegebene
        ChatGPT-Verbindung. Bei einem Limit wird gestoppt. Prüfe in ChatGPT,
        dass keine zusätzlichen Guthaben-Käufe oder bezahlte Mehrnutzung
        aktiviert sind.
      </p>
      <a
        href="https://chatgpt.com/settings/usage"
        target="_blank"
        rel="noopener noreferrer"
      >
        ChatGPT-Nutzung verwalten ↗
      </a>
      {status?.local === false && (
        <p>
          Die direkte Anmeldung ist in dieser Version nur auf dem Mac verfügbar,
          auf dem Fitmin lokal läuft. Nutze hier „Über ChatGPT kopieren
          & importieren“.
        </p>
      )}
      {status?.local && (
        <>
          {status.accounts.length > 0 && (
            <label>
              ChatGPT-Konto
              <select
                disabled={busy || disabled || status.pending}
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                }}
              >
                <option value="">Anderes Konto verbinden</option>
                {status.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                    {a.connected ? "" : " (getrennt)"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {status.pending ? (
            <>
              <p role="status">
                ChatGPT-Anmeldung vorbereitet. Öffne die Anmeldung im Browser
                auf diesem Mac. Danach hier zurückkehren.
              </p>
              {url && (
                <a
                  className="button"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue with ChatGPT ↗
                </a>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy || disabled}
                onClick={() => action("cancel")}
              >
                Anmeldung abbrechen
              </button>
            </>
          ) : (
            <div className="row">
              <button
                type="button"
                className="secondary"
                disabled={busy || disabled}
                onClick={() => action("connect", selected || undefined)}
              >
                Continue with ChatGPT
              </button>
              {selected &&
                selected !== status.active &&
                status.accounts.find((a) => a.id === selected)?.connected && (
                  <button
                    type="button"
                    disabled={busy || disabled}
                    onClick={() => action("select", selected)}
                  >
                    Konto verwenden
                  </button>
                )}
              {status.available && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || disabled}
                  onClick={() => action("disconnect", status.active!)}
                >
                  ChatGPT trennen
                </button>
              )}
            </div>
          )}
          {status.available && active && (
            <>
              <p role="status">ChatGPT-Abo verbunden: {active.label}</p>
              <label>
                ChatGPT-Modell
                <select
                  value={active.model}
                  disabled={busy || disabled}
                  onChange={(e) => action("model", active.id, e.target.value)}
                >
                  <option value="">Modell auswählen …</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </>
      )}
      {status?.message && <p role="status">{status.message}</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
