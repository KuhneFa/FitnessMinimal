"use client";
import { useEffect, useRef, useState } from "react";
import type { ModelReply } from "@/lib/ai-contract";
import { ChatGptConnection } from "./chatgpt-connection";
import { ModelReplyView } from "./model-reply";

export function NutritionAi<T>({
  endpoint,
  payload,
  disabled,
  label,
  onResult,
  onBusyChange,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  disabled: boolean;
  label: string;
  onResult: (data: T) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState<ModelReply | null>(null);
  const [prompt, setPrompt] = useState("");
  const [exported, setExported] = useState("");
  const [importText, setImportText] = useState("");
  const fingerprint = JSON.stringify(payload);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function action(mode: "generate" | "prompt" | "import") {
    if (controller.current || disabled) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    setReply(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          mode,
          ...(mode === "import" ? { reply: importText } : {}),
        }),
        signal: request.signal,
      });
      const data = await response.json();
      if (data.reply) setReply(data.reply);
      if (!response.ok)
        throw new Error(data.error || "Anfrage fehlgeschlagen.");
      if (mode === "prompt") {
        setPrompt(data.prompt);
        setExported(fingerprint);
        setImportText("");
      } else {
        onResult(data);
        setPrompt("");
        setImportText("");
      }
    } catch (e) {
      if (!request.signal.aborted)
        setError(e instanceof Error ? e.message : "Anfrage fehlgeschlagen.");
    } finally {
      controller.current = null;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="stack nutrition-ai">
      <details>
        <summary>ChatGPT-Verbindung</summary>
        <ChatGptConnection
          disabled={busy || disabled}
          onChange={setAvailable}
        />
      </details>
      <button
        type="button"
        disabled={disabled || busy || !available}
        onClick={() => action("generate")}
      >
        {busy ? "Wird vorbereitet …" : label}
      </button>
      <details>
        <summary>Über ChatGPT kopieren &amp; importieren</summary>
        <div className="stack">
          <p className="muted">
            Anfrage vorbereiten, in ChatGPT einfügen und die vollständige
            Antwort zurückkopieren. Keine kostenpflichtige API.
          </p>
          <button
            type="button"
            className="secondary"
            disabled={disabled || busy}
            onClick={() => action("prompt")}
          >
            ChatGPT-Anfrage vorbereiten
          </button>
          {prompt && (
            <>
              <label>
                Anfrage für ChatGPT
                <textarea
                  readOnly
                  rows={6}
                  value={prompt}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prompt);
                    setNotice("Anfrage kopiert.");
                  } catch {
                    setNotice(
                      "Bitte die Anfrage im Textfeld markieren und kopieren.",
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
              {exported !== fingerprint && (
                <p role="status">
                  Deine Angaben haben sich geändert. Bereite die Anfrage erneut
                  vor.
                </p>
              )}
              <label>
                Antwort aus ChatGPT
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  maxLength={65536}
                />
              </label>
              <button
                type="button"
                disabled={
                  disabled ||
                  busy ||
                  exported !== fingerprint ||
                  !importText.trim()
                }
                onClick={() => action("import")}
              >
                Antwort prüfen
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
      {notice && <p role="status">{notice}</p>}
      {reply && (
        <ModelReplyView
          reply={reply}
          failed={!!error}
          onDismiss={() => setReply(null)}
        />
      )}
    </div>
  );
}
