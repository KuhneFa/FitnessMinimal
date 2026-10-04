"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS } from "@/lib/ai-contract";

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
    "idle" | "permission" | "recording" | "ready" | "sending"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<Blob | null>(null);
  const alive = useRef(false);
  const discard = useRef(false);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => {
    busyCallback.current = onBusyChange;
  });
  useEffect(() => {
    alive.current = true;
    const hide = () => {
      if (
        document.visibilityState === "hidden" &&
        recorder.current?.state === "recording"
      ) {
        recorder.current.stop();
        stream.current?.getTracks().forEach((track) => track.stop());
        if (clock.current) clearInterval(clock.current);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      generation.current++;
      alive.current = false;
      discard.current = true;
      request.current?.abort();
      if (clock.current) clearInterval(clock.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      chunks.current = [];
      audio.current = null;
      busyCallback.current(false);
    };
  }, []);
  function release() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (clock.current) clearInterval(clock.current);
    clock.current = null;
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    release();
  }
  async function start() {
    const attempt = ++generation.current;
    setError("");
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Sprachaufnahme ist hier nicht verfügbar. Öffne die App über HTTPS in Safari oder Chrome, oder tippe deine Wünsche ein.",
      );
      return;
    }
    setPhase("permission");
    busyCallback.current(true);
    discard.current = false;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || discard.current || attempt !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) {
        release();
        throw new Error(
          "Dein Browser unterstützt kein passendes Aufnahmeformat. Bitte tippe deine Wünsche ein.",
        );
      }
      const recording = new MediaRecorder(media, {
        mimeType: mime,
        audioBitsPerSecond: 64000,
      });
      recorder.current = recording;
      chunks.current = [];
      audio.current = null;
      let size = 0;
      recording.ondataavailable = (event) => {
        if (discard.current || !alive.current || attempt !== generation.current)
          return;
        if (event.data.size) {
          size += event.data.size;
          if (size > MAX_AUDIO_BYTES) {
            discard.current = true;
            chunks.current = [];
            setError("Die Aufnahme ist zu groß. Bitte kürzer aufnehmen.");
            stop();
            return;
          }
          chunks.current.push(event.data);
        }
      };
      recording.onstop = () => {
        if (attempt !== generation.current) return;
        release();
        if (!alive.current) return;
        if (discard.current) {
          chunks.current = [];
          audio.current = null;
          setPhase("idle");
          busyCallback.current(false);
          return;
        }
        const blob = new Blob(chunks.current, { type: recording.mimeType });
        chunks.current = [];
        if (blob.size < 16) {
          setError("Die Aufnahme war zu kurz. Bitte erneut versuchen.");
          setPhase("idle");
          busyCallback.current(false);
          return;
        }
        audio.current = blob;
        setPhase("ready");
      };
      recording.onerror = () => {
        if (attempt !== generation.current) return;
        discard.current = true;
        release();
        chunks.current = [];
        audio.current = null;
        if (alive.current) {
          setError("Die Aufnahme wurde unterbrochen. Bitte erneut aufnehmen.");
          setPhase("idle");
          busyCallback.current(false);
        }
      };
      media.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (attempt === generation.current && recording.state === "recording")
            stop();
        };
      });
      recording.start(500);
      setPhase("recording");
      setSeconds(0);
      const started = Date.now();
      clock.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));
        if (elapsed >= MAX_RECORDING_SECONDS) stop();
      }, 250);
    } catch (e) {
      if (attempt !== generation.current) return;
      release();
      if (alive.current) {
        setPhase("idle");
        busyCallback.current(false);
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Mikrofonzugriff abgelehnt. Erlaube das Mikrofon in den Website-Einstellungen oder tippe deine Wünsche ein."
            : e instanceof DOMException && e.name === "NotSupportedError"
              ? "Sprachaufnahme wird in dieser Browserumgebung nicht unterstützt. Bitte tippe deine Wünsche ein oder verwende Safari/Chrome in einer aktuellen Version."
              : e instanceof Error
                ? e.message
                : "Mikrofon konnte nicht geöffnet werden.",
        );
      }
    }
  }
  function reset() {
    generation.current++;
    discard.current = true;
    request.current?.abort();
    stop();
    audio.current = null;
    chunks.current = [];
    setPhase("idle");
    setSeconds(0);
    busyCallback.current(false);
  }
  async function transcribe() {
    if (!audio.current) return;
    const attempt = generation.current;
    setPhase("sending");
    setError("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": audio.current.type },
        body: audio.current,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Transkription fehlgeschlagen.");
      if (!alive.current || attempt !== generation.current) return;
      if (typeof data.text !== "string")
        throw new Error("Kein verwertbarer Text erkannt.");
      onTranscript(data.text);
      audio.current = null;
      setPhase("idle");
      setSeconds(0);
      busyCallback.current(false);
    } catch (e) {
      if (alive.current && !discard.current && attempt === generation.current) {
        setError(
          e instanceof TypeError || controller.signal.aborted
            ? "Die Übertragung wurde unterbrochen. Du kannst die Aufnahme erneut senden oder verwerfen."
            : e instanceof Error
              ? e.message
              : "Transkription fehlgeschlagen.",
        );
        setPhase("ready");
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  }
  return (
    <div className="voice-input">
      <div className="row">
        <div>
          <p className="voice-title">Lieber erzählen?</p>
          <p className="muted voice-help">
            Bis zu 90 Sekunden aufnehmen. Danach den erkannten Text prüfen.
          </p>
        </div>
        {phase === "idle" && (
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={start}
          >
            <svg
              width="18"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
            </svg>
            Einsprechen
          </button>
        )}
      </div>
      {phase === "permission" && (
        <p role="status">
          Warte auf Mikrofonfreigabe …{" "}
          <button type="button" className="secondary" onClick={reset}>
            Abbrechen
          </button>
        </p>
      )}
      {phase === "recording" && (
        <div className="row">
          <span role="status" className="recording-label">
            <span className="recording-dot" aria-hidden="true" />
            Aufnahme läuft · {seconds} / {MAX_RECORDING_SECONDS} Sek.
          </span>
          <button type="button" onClick={stop}>
            Aufnahme stoppen
          </button>
        </div>
      )}
      {(phase === "ready" || phase === "sending") && (
        <div className="stack">
          <p role="status">
            {phase === "sending"
              ? "Deine Aufnahme wird in Text umgewandelt …"
              : "Aufnahme bereit. Erst beim Transkribieren wird sie an OpenAI gesendet."}
          </p>
          <div className="row">
            <button
              type="button"
              disabled={phase === "sending"}
              onClick={transcribe}
            >
              {phase === "sending"
                ? "Transkribieren …"
                : "Aufnahme transkribieren"}
            </button>
            <button type="button" className="secondary" onClick={reset}>
              {phase === "sending" ? "Abbrechen" : "Aufnahme verwerfen"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
