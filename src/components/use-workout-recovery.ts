"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Workout } from "@/lib/workouts";
import {
  acknowledgeDeviceDraft,
  announceDeviceChange,
  DeviceRevokedError,
  DeviceWorkoutClosedError,
  discardDeviceDrafts,
  migrateLegacyRecovery,
  openDeviceWorkout,
  readDeviceDrafts,
  saveDeviceDraft,
  watchDeviceChanges,
  type SetDraft,
  type StoredDraft,
} from "@/lib/device-storage";

type Row = Workout["exercises"][number]["sets"][number];
const numeric = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));
const subscribeNetwork = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

export function useWorkoutRecovery(initial: Workout) {
  const [workout, setWorkout] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [status, setStatus] = useState("Gerätespeicher wird geladen …");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [alternatives, setAlternatives] = useState<StoredDraft[]>([]);
  const [ready, setReady] = useState(false);
  const online = useSyncExternalStore(
    subscribeNetwork,
    () => navigator.onLine,
    () => true,
  );
  const pending = useRef<Record<string, SetDraft>>({});
  const current = useRef(initial);
  const epoch = useRef<string | null>(null);
  const loaded = useRef(false);
  const blocked = useRef(false);
  const inFlight = useRef(false);
  const localWrites = useRef<Promise<void>>(Promise.resolve());
  const retryAt = useRef(0);
  const failures = useRef(0);
  const storageFailed = useRef(false);
  const flush = useRef<() => Promise<void>>(async () => {});

  const storageFailure = useCallback(
    (e: unknown) => {
      if (e instanceof DeviceRevokedError) {
        blocked.current = true;
        loaded.current = false;
        pending.current = {};
        setReady(false);
        // Remove private React state too. A revoked/finished tab must not keep
        // editing, even if its old network request is still in flight.
        window.location.replace(
          navigator.onLine
            ? e instanceof DeviceWorkoutClosedError
              ? `/history/${initial.id}`
              : "/"
            : "/offline",
        );
        return;
      }
      storageFailed.current = true;
      setStorageError(true);
    },
    [initial.id],
  );

  function detectConflicts(entries: StoredDraft[]) {
    const conflicting = entries.filter((entry) =>
      entries.some(
        (other) =>
          other.setId === entry.setId &&
          other.draft.mutationId !== entry.draft.mutationId,
      ),
    );
    if (!conflicting.length) return false;
    blocked.current = true;
    setConflict(true);
    setAlternatives(entries);
    setError(
      "Für einen Satz liegen unterschiedliche Eingaben aus mehreren Fenstern vor. Bitte prüfe die Werte. Es wird nichts überschrieben.",
    );
    setStatus("Konflikt – Eingaben bleiben auf diesem Gerät");
    return true;
  }

  function edit(
    set: Row,
    field: "weight" | "reps" | "rir" | "completed",
    value: string | boolean,
    timestamp: number,
  ) {
    if (!loaded.current) return;
    const previous = pending.current[set.id];
    const row = current.current.exercises
      .flatMap((e) => e.sets)
      .find((s) => s.id === set.id)!;
    const draft: SetDraft = {
      ...(previous || {
        weight: String(row.weight),
        reps: row.reps === null ? "" : String(row.reps),
        rir: row.rir === null ? "" : String(row.rir),
        completed: row.completed,
        version: row.version,
      }),
      [field]: value,
      mutationId: crypto.randomUUID(),
      timestamp,
    };
    pending.current[set.id] = draft;
    setDrafts({ ...pending.current });
    setStatus("Änderungen werden gespeichert …");
    // Capture this edit, not the future contents of pending. Serializing local
    // commits prevents fast keystrokes or a late server ACK from losing edits.
    localWrites.current = localWrites.current
      .then(async () => {
        if (!epoch.current) throw new Error("Gerätespeicher nicht verfügbar.");
        await saveDeviceDraft(
          epoch.current,
          { workoutId: initial.id, setId: set.id, draft },
          previous?.mutationId,
        );
        if (
          !blocked.current &&
          pending.current[set.id]?.mutationId === draft.mutationId
        )
          setStatus(
            navigator.onLine
              ? "Auf Gerät gespeichert · Synchronisierung läuft …"
              : "Noch nicht synchronisiert",
          );
        announceDeviceChange();
      })
      .catch(storageFailure);
  }

  useEffect(() => {
    flush.current = async () => {
      if (
        !loaded.current ||
        inFlight.current ||
        blocked.current ||
        Date.now() < retryAt.current
      )
        return;
      inFlight.current = true;
      try {
        await localWrites.current;
        if (blocked.current) return;
        if (epoch.current && !storageFailed.current) {
          const entries = await readDeviceDrafts(epoch.current, initial.id);
          if (detectConflicts(entries)) return;
        }
        for (const [id, draft] of Object.entries(pending.current)) {
          if (blocked.current) break;
          const weight = numeric(draft.weight);
          const reps = draft.reps.trim() === "" ? null : numeric(draft.reps);
          const rir = draft.rir.trim() === "" ? null : numeric(draft.rir);
          if (
            !Number.isFinite(weight) ||
            weight < 0 ||
            weight > 1000 ||
            (reps !== null &&
              (!Number.isInteger(reps) || reps < 0 || reps > 100)) ||
            (rir !== null && (!Number.isInteger(rir) || rir < 0 || rir > 10)) ||
            (draft.completed && (reps === null || reps === 0 || rir === null))
          ) {
            setStatus("Bitte kg, Wiederholungen und RIR vollständig eintragen");
            continue;
          }
          if (!navigator.onLine) throw new TypeError("Offline");
          const res = await fetch(`/api/workouts/${initial.id}/sets/${id}`, {
            method: "PATCH",
            signal: AbortSignal.timeout(10000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weight,
              reps,
              rir,
              completed: draft.completed,
              version: draft.version,
              mutationId: draft.mutationId,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409 || res.status === 401) {
              blocked.current = true;
              setConflict(true);
            }
            throw new Error(data.error);
          }
          if (!loaded.current) return;
          const saved = data as Row;
          failures.current = 0;
          retryAt.current = 0;
          current.current = {
            ...current.current,
            exercises: current.current.exercises.map((e) => ({
              ...e,
              sets: e.sets.map((s) => (s.id === id ? saved : s)),
            })),
          };
          setWorkout(current.current);
          if (pending.current[id]?.mutationId === draft.mutationId)
            delete pending.current[id];
          else if (pending.current[id])
            pending.current[id] = {
              ...pending.current[id],
              version: saved.version,
            };
          const successor = pending.current[id]
            ? { workoutId: initial.id, setId: id, draft: pending.current[id] }
            : undefined;
          const confirmed = current.current;
          // Append the ACK after any edits that arrived during the HTTP request.
          localWrites.current = localWrites.current
            .then(async () => {
              if (epoch.current)
                await acknowledgeDeviceDraft(
                  epoch.current,
                  confirmed,
                  draft.mutationId,
                  successor,
                );
              announceDeviceChange();
            })
            .catch(storageFailure);
          await localWrites.current;
          setDrafts({ ...pending.current });
          if (!blocked.current) setError("");
        }
        if (!Object.keys(pending.current).length && !blocked.current)
          setStatus("Alle Änderungen gespeichert");
      } catch (e) {
        if (e instanceof DeviceRevokedError) {
          storageFailure(e);
          return;
        }
        failures.current++;
        retryAt.current =
          Date.now() + Math.min(15000, 1000 * 2 ** failures.current);
        setStatus("Noch nicht synchronisiert");
        setError(
          e instanceof TypeError || e instanceof DOMException
            ? storageFailed.current
              ? "Keine Verbindung. Eingaben sind nur im offenen Fenster verfügbar. Bitte nicht schließen."
              : "Keine Verbindung. Offene Werte bleiben zur Wiederherstellung auf diesem Gerät."
            : e instanceof Error
              ? e.message
              : "Speichern fehlgeschlagen.",
        );
      } finally {
        inFlight.current = false;
      }
    };
  });

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const device = await openDeviceWorkout(initial);
        if (cancelled) return;
        epoch.current = device.epoch;
        current.current = device.snapshot;
        setWorkout(device.snapshot);
        try {
          await migrateLegacyRecovery(device.epoch, initial);
        } catch {
          setError(
            "Ältere lokale Eingaben konnten nicht übernommen werden. Sie bleiben unverändert im Gerätespeicher erhalten.",
          );
        }
        const entries = await readDeviceDrafts(device.epoch, initial.id);
        if (cancelled) return;
        for (const entry of entries)
          if (!pending.current[entry.setId])
            pending.current[entry.setId] = entry.draft;
        setDrafts({ ...pending.current });
        if (!detectConflicts(entries))
          setStatus(
            entries.length
              ? "Offene Werte werden wiederhergestellt …"
              : "Alle Änderungen gespeichert",
          );
      } catch (e) {
        if (cancelled) return;
        storageFailure(e);
        if (e instanceof DeviceRevokedError) return;
        setStatus("Nur Online-Speicherung verfügbar");
      }
      if (!cancelled) {
        loaded.current = true;
        setReady(true);
      }
    }
    void restore();
    const interval = setInterval(() => {
      void flush.current();
    }, 800);
    const resume = () => {
      retryAt.current = 0;
      void flush.current();
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const stopWatching = watchDeviceChanges(() => {
      if (!epoch.current || !loaded.current) return;
      void localWrites.current
        .then(() => readDeviceDrafts(epoch.current!, initial.id))
        .then((entries) => {
          if (!cancelled) detectConflicts(entries);
        })
        .catch(storageFailure);
    });
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelled = true;
      loaded.current = false;
      clearInterval(interval);
      stopWatching();
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [initial, storageFailure]);

  async function discard() {
    if (
      inFlight.current ||
      !window.confirm(
        "Offene Werte in allen Fenstern für dieses Training verwerfen und gespeicherte Serverwerte laden? Notiere bei Bedarf zuerst deine Eingaben.",
      )
    )
      return;
    blocked.current = true;
    try {
      await localWrites.current;
      const res = await fetch(`/api/workouts/${initial.id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data: Workout = await res.json();
      if (epoch.current)
        epoch.current = await discardDeviceDrafts(epoch.current, data);
      pending.current = {};
      setDrafts({});
      current.current = data;
      setWorkout(data);
      setAlternatives([]);
      blocked.current = false;
      setConflict(false);
      setError("");
      setStatus("Serverstand geladen");
      // Other editors must reload instead of reintroducing their discarded draft.
      announceDeviceChange();
    } catch {
      setError(
        "Serverstand konnte nicht geladen werden. Deine Eingaben bleiben erhalten.",
      );
    }
  }
  function retry() {
    // A local multi-window conflict requires an explicit decision first.
    if (alternatives.length) return;
    blocked.current = false;
    retryAt.current = 0;
    void flush.current();
  }
  return {
    workout,
    drafts,
    status,
    error,
    storageError,
    conflict,
    alternatives,
    ready,
    online,
    edit,
    retry,
    discard,
  };
}
