"use client";
import { useEffect, useRef, useState } from "react";
import {
  dictationText,
  updateDictation,
  type SpeechResult,
} from "@/lib/dictation";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function VoiceInput({
  disabled,
  onTranscript,
  onBusyChange,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<
    "idle" | "listening" | "stopping" | "ready"
  >("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const session = useRef<{
    recognition: Recognition | null;
    timer: ReturnType<typeof setTimeout> | null;
    finishTimer: ReturnType<typeof setTimeout> | null;
    stop: (() => void) | null;
    text: string;
  }>({
    recognition: null,
    timer: null,
    finishTimer: null,
    stop: null,
    text: "",
  });
  const busyCallback = useRef(onBusyChange);
  useEffect(() => {
    busyCallback.current = onBusyChange;
  });
  useEffect(() => {
    const current = session.current;
    const hide = () => {
      if (document.visibilityState === "hidden") current.stop?.();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      if (current.timer) clearTimeout(current.timer);
      if (current.finishTimer) clearTimeout(current.finishTimer);
      current.stop = null;
      if (current.recognition) {
        current.recognition.onend = null;
        current.recognition.onresult = null;
        current.recognition.onerror = null;
        current.recognition.abort();
        current.recognition = null;
      }
      current.text = "";
      busyCallback.current(false);
    };
  }, []);
  function discard() {
    const current = session.current;
    if (current.recognition) {
      current.recognition.onend = null;
      current.recognition.onresult = null;
      current.recognition.onerror = null;
      current.recognition.abort();
      current.recognition = null;
    }
    if (current.timer) clearTimeout(current.timer);
    if (current.finishTimer) clearTimeout(current.finishTimer);
    current.stop = null;
    current.text = "";
    setDraft("");
    setPhase("idle");
    busyCallback.current(false);
  }
  function start() {
    setError("");
    const Speech =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!window.isSecureContext || !Speech) {
      setError(
        "Dieser Browser bietet keine Diktierfunktion an. Tippe in das Textfeld und nutze das Mikrofon deiner iPhone-/Mac-Tastatur oder gib den Text ein.",
      );
      return;
    }
    const recognition = new Speech();
    const current = session.current;
    current.recognition = recognition;
    current.text = "";
    setDraft("");
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    let segments: string[] = [];
    let stopping = false;
    const finish = (abort = false) => {
      if (current.recognition !== recognition) return;
      if (current.timer) clearTimeout(current.timer);
      if (current.finishTimer) clearTimeout(current.finishTimer);
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      current.recognition = null;
      current.stop = null;
      if (abort) recognition.abort();
      setDraft(current.text);
      setPhase(current.text ? "ready" : "idle");
      busyCallback.current(!!current.text);
    };
    const stop = () => {
      if (current.recognition !== recognition || stopping) return;
      stopping = true;
      setPhase("stopping");
      // Some browsers deliver final corrections asynchronously; others never
      // emit onend. In either case, keep everything already shown to the user.
      current.finishTimer = setTimeout(() => finish(true), 2000);
      try {
        recognition.stop();
      } catch {
        finish(true);
      }
    };
    current.stop = stop;
    recognition.onresult = (event) => {
      if (current.recognition !== recognition) return;
      segments = updateDictation(segments, event.results, stopping);
      current.text = dictationText(segments);
      setDraft(current.text);
      if (current.text.length >= 6000) stop();
    };
    recognition.onerror = (event) => {
      if (current.recognition !== recognition) return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Mikrofonzugriff abgelehnt. Nutze die Website-Einstellungen oder die Diktierfunktion deiner Tastatur."
          : "Diktieren wurde unterbrochen. Bereits erkannter Text bleibt erhalten. Du kannst auch tippen oder die Tastatur-Diktierfunktion nutzen.",
      );
      stop();
    };
    recognition.onend = () => finish();
    try {
      setPhase("listening");
      busyCallback.current(true);
      current.timer = setTimeout(stop, 90000);
      recognition.start();
    } catch {
      discard();
      setError(
        "Diktieren konnte nicht gestartet werden. Nutze die Diktierfunktion deiner Tastatur oder tippe deine Wünsche ein.",
      );
    }
  }
  return (
    <div className="voice-input">
      <div className="row">
        <div>
          <p className="voice-title">Lieber erzählen?</p>
          <p className="voice-help muted">
            Direkt diktieren und den erkannten Text prüfen.
          </p>
        </div>
        {phase === "idle" && (
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={start}
          >
            Einsprechen
          </button>
        )}
        {phase === "listening" && (
          <button type="button" onClick={() => session.current.stop?.()}>
            Diktieren stoppen
          </button>
        )}
      </div>
      <p className="voice-help muted">
        Keine kostenpflichtige Transkriptions-API. Die Spracherkennung übernimmt
        dein Browser; dabei kann Audio an dessen Anbieter gesendet werden.
        Alternativ: Mikrofon auf deiner Tastatur nutzen.
      </p>
      {phase === "listening" && (
        <p role="status">
          Diktieren läuft … spätestens nach 90 Sekunden wird gestoppt.
        </p>
      )}
      {phase === "stopping" && (
        <p role="status">
          Diktat wird abgeschlossen … dein Text bleibt erhalten.
        </p>
      )}
      {phase !== "idle" && (
        <>
          <label>
            Erkannter Text
            <textarea
              value={draft}
              rows={3}
              disabled={phase !== "ready"}
              onChange={(e) => {
                setDraft(e.target.value);
                session.current.text = e.target.value;
              }}
            />
          </label>
          {draft.length > 6000 && (
            <p role="status" className="error">
              Dein vollständiges Diktat ist erhalten. Bitte kürze es vor dem
              Anfordern eines Vorschlags auf höchstens 6.000 Zeichen.
            </p>
          )}
          <div className="row">
            {phase === "ready" && (
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  onTranscript(draft.trim());
                  discard();
                }}
              >
                Text übernehmen
              </button>
            )}
            <button type="button" className="secondary" onClick={discard}>
              Diktat verwerfen
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
