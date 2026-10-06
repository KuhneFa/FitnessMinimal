"use client";
import { useId, useState } from "react";
import type { ModelReply } from "@/lib/ai-contract";

export function ModelReplyView({
  reply,
  failed,
  onDismiss,
}: {
  reply: ModelReply;
  failed: boolean;
  onDismiss: () => void;
}) {
  const [notice, setNotice] = useState("");
  const textId = useId();
  const status = {
    completed: "Antwort vollständig empfangen",
    incomplete: "Antwort unvollständig – kein Plan übernommen",
    refused: "ChatGPT hat die Anfrage abgelehnt",
    failed: "Anfrage fehlgeschlagen – kein Plan übernommen",
    imported: "Von dir eingefügte Antwort",
  }[reply.status];
  return (
    <details
      className="model-reply profile-details"
      open={failed ? true : undefined}
    >
      <summary>Originalantwort von ChatGPT</summary>
      <div className="stack" style={{ marginTop: 16 }}>
        <p className="muted">
          {status}. Hier steht der empfangene Antworttext vor unserer
          Verarbeitung. Er bleibt nur in diesem geöffneten Editor.
        </p>
        {reply.truncated && (
          <p className="error" role="status">
            Die Antwort war zu groß. Angezeigt werden nur die ersten 64 KB;
            dieser Ausschnitt wurde nicht als Plan übernommen.
          </p>
        )}
        {reply.text ? (
          <>
            <label htmlFor={textId}>
              Unveränderter Antworttext{reply.truncated ? " (Ausschnitt)" : ""}
            </label>
            <textarea
              id={textId}
              readOnly
              rows={9}
              value={reply.text}
              spellCheck={false}
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reply.text);
                  setNotice("Antwort kopiert.");
                } catch {
                  setNotice(
                    "Markiere den Antworttext und kopiere ihn manuell.",
                  );
                }
              }}
            >
              Antwort kopieren
            </button>
          </>
        ) : (
          <p>Es wurde kein Antworttext empfangen.</p>
        )}
        {notice && <p role="status">{notice}</p>}
        <button type="button" className="secondary" onClick={onDismiss}>
          Antwort ausblenden
        </button>
      </div>
    </details>
  );
}
