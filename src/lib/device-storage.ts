import { z } from "zod";
import type { Workout } from "./workouts";

export const DEVICE_DATABASE = "fitmin-device";
export const LEGACY_RECOVERY_KEY = "fittrack-recovery";
const uuid = z.string().uuid();
export const draftSchema = z.object({
  weight: z.string().max(32),
  reps: z.string().max(32),
  rir: z.string().max(32),
  completed: z.boolean(),
  version: z.number().int().nonnegative(),
  mutationId: uuid,
  timestamp: z.number().finite().nonnegative(),
});
export type SetDraft = z.infer<typeof draftSchema>;
const storedDraftSchema = z.object({
  workoutId: uuid,
  setId: uuid,
  draft: draftSchema,
});
export type StoredDraft = z.infer<typeof storedDraftSchema>;
const number = z.number().finite();
const setSnapshot = z.object({
  id: uuid,
  workoutExerciseId: uuid,
  position: number,
  weight: number,
  reps: number.nullable(),
  rir: number.nullable(),
  completed: z.boolean(),
  version: number,
  updatedAt: number,
  mutationId: z.string().nullable(),
});
const workoutSnapshot: z.ZodType<Workout> = z.object({
  id: uuid,
  dayName: z.string(),
  planName: z.string(),
  startedAt: number,
  finishedAt: number.nullable(),
  active: number.nullable(),
  fatigue: number.nullable(),
  performance: number.nullable(),
  note: z.string().nullable(),
  timerEnd: number.nullable(),
  timerRemaining: number.nullable(),
  timerVersion: number,
  exercises: z
    .array(
      z.object({
        id: uuid,
        workoutId: uuid,
        exerciseId: uuid,
        name: z.string(),
        position: number,
        minReps: number,
        maxReps: number,
        targetRir: number,
        increment: number,
        rest: number,
        recommendation: z.string(),
        instructions: z.string(),
        sets: z.array(setSnapshot).max(100),
        previous: z
          .object({
            finishedAt: number.nullable(),
            sets: z.array(setSnapshot).max(100),
          })
          .nullable(),
      }),
    )
    .max(100),
});
const stateSchema = z.object({
  epoch: uuid,
  revoked: z.boolean(),
  sessionTag: z.string().nullable().default(null),
  snapshot: workoutSnapshot.nullable(),
  drafts: z.array(storedDraftSchema).max(2000),
  closed: z.array(uuid).max(100),
});
type DeviceState = z.infer<typeof stateSchema>;
export class DeviceRevokedError extends Error {}
export class DeviceWorkoutClosedError extends DeviceRevokedError {}
let opening: Promise<IDBDatabase> | undefined;

function database() {
  if (!opening)
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DEVICE_DATABASE, 1);
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        reject(new Error("Gerätespeicher antwortet nicht."));
      }, 5000);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timer);
        expired = true;
        reject(
          new Error("Gerätespeicher ist durch ein anderes Fenster blockiert."),
        );
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (expired) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => {
          request.result.close();
          opening = undefined;
        };
        request.result.onclose = () => {
          opening = undefined;
        };
        resolve(request.result);
      };
    }).catch((error) => {
      opening = undefined;
      throw error;
    });
  return opening;
}

// All updates read + write in one transaction. Resolve only on commit, never
// on request success. No network or other async work inside the transaction.
async function update<T>(
  fn: (state: DeviceState) => T,
  mode: IDBTransactionMode = "readwrite",
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", mode);
    let result: T, failure: unknown;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(
        failure || tx.error || new Error("Lokale Speicherung abgebrochen."),
      );
    tx.onerror = () => {
      /* onabort reports the final outcome */
    };
    const store = tx.objectStore("state");
    const read = store.get("device");
    read.onsuccess = () => {
      try {
        const state =
          read.result === undefined
            ? {
                epoch: crypto.randomUUID(),
                revoked: false,
                sessionTag: null,
                snapshot: null,
                drafts: [],
                closed: [],
              }
            : stateSchema.parse(read.result);
        result = fn(state);
        if (mode === "readwrite") store.put(stateSchema.parse(state), "device");
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}

function assertEpoch(state: DeviceState, epoch: string) {
  if (state.revoked || state.epoch !== epoch)
    throw new DeviceRevokedError(
      "Dieses Fenster gehört zu einer früheren Anmeldung. Bitte neu öffnen.",
    );
}
function mergeSnapshot(state: DeviceState, incoming: Workout) {
  if (state.closed.includes(incoming.id))
    throw new DeviceWorkoutClosedError(
      "Dieses Training wurde bereits beendet.",
    );
  const old = state.snapshot?.id === incoming.id ? state.snapshot : null;
  const sets = new Map(
    old?.exercises.flatMap((e) => e.sets).map((s) => [s.id, s]),
  );
  state.snapshot = {
    ...incoming,
    exercises: incoming.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) =>
        (sets.get(s.id)?.version ?? -1) > s.version ? sets.get(s.id)! : s,
      ),
    })),
  };
}

export async function openDeviceWorkout(workout: Workout) {
  const snapshot = workoutSnapshot.parse(workout);
  const result = await update((state) => {
    assertEpoch(state, state.epoch);
    mergeSnapshot(state, snapshot);
    return {
      epoch: state.epoch,
      snapshot: state.snapshot!,
      drafts: state.drafts.filter((d) => d.workoutId === workout.id),
    };
  });
  return result;
}
export async function readDeviceWorkout() {
  return update((state) => (state.revoked ? null : state.snapshot), "readonly");
}
export async function readDeviceDrafts(epoch: string, workoutId: string) {
  return update((state) => {
    assertEpoch(state, epoch);
    if (state.closed.includes(workoutId))
      throw new DeviceWorkoutClosedError(
        "Dieses Training wurde bereits beendet.",
      );
    return state.drafts.filter((d) => d.workoutId === workoutId);
  }, "readonly");
}
export async function saveDeviceDraft(
  epoch: string,
  value: StoredDraft,
  replaces?: string,
) {
  const entry = storedDraftSchema.parse(value);
  await update((state) => {
    assertEpoch(state, epoch);
    if (state.closed.includes(entry.workoutId))
      throw new DeviceWorkoutClosedError("Training bereits beendet.");
    // Replace only this editor's predecessor. Keep concurrent drafts from other
    // windows so recovery can surface a conflict rather than silently choosing.
    state.drafts = state.drafts.filter(
      (d) =>
        d.draft.mutationId !== entry.draft.mutationId &&
        !(
          d.workoutId === entry.workoutId &&
          d.setId === entry.setId &&
          d.draft.mutationId === replaces
        ),
    );
    state.drafts.push(entry);
  });
}
export async function acknowledgeDeviceDraft(
  epoch: string,
  workout: Workout,
  mutationId: string,
  successor?: StoredDraft,
) {
  await update((state) => {
    assertEpoch(state, epoch);
    mergeSnapshot(state, workoutSnapshot.parse(workout));
    state.drafts = state.drafts.filter(
      (d) => d.draft.mutationId !== mutationId,
    );
    if (successor) {
      const parsed = storedDraftSchema.parse(successor);
      const row = state.drafts.find(
        (d) => d.draft.mutationId === parsed.draft.mutationId,
      );
      if (row) row.draft.version = parsed.draft.version;
    }
  });
}
export async function discardDeviceDrafts(epoch: string, workout: Workout) {
  return update((state) => {
    assertEpoch(state, epoch);
    mergeSnapshot(state, workout);
    state.drafts = state.drafts.filter((d) => d.workoutId !== workout.id);
    state.epoch = crypto.randomUUID();
    return state.epoch;
  });
}
export async function closeDeviceWorkout(workoutId: string) {
  await update((state) => {
    if (state.snapshot?.id === workoutId) state.snapshot = null;
    state.drafts = state.drafts.filter((d) => d.workoutId !== workoutId);
    state.closed = [
      ...state.closed.filter((id) => id !== workoutId),
      workoutId,
    ].slice(-100);
  });
  announceDeviceChange(false);
}

export async function migrateLegacyRecovery(epoch: string, workout: Workout) {
  const raw = localStorage.getItem(LEGACY_RECOVERY_KEY);
  if (!raw) return;
  const legacy = z
    .object({ workoutId: uuid, sets: z.record(uuid, draftSchema) })
    .parse(JSON.parse(raw));
  // Preserve an unrelated old workout for explicit review, never delete it.
  if (legacy.workoutId !== workout.id) return;
  const ids = new Set(
    workout.exercises.flatMap((e) => e.sets.map((s) => s.id)),
  );
  if (Object.keys(legacy.sets).some((id) => !ids.has(id)))
    throw new Error("Ältere Eingaben passen nicht zum Training.");
  await update((state) => {
    assertEpoch(state, epoch);
    for (const [setId, draft] of Object.entries(legacy.sets))
      if (!state.drafts.some((d) => d.draft.mutationId === draft.mutationId))
        state.drafts.push({ workoutId: workout.id, setId, draft });
  });
  // Delete only after durable import, and only if the legacy writer did not
  // change its contents while the IndexedDB transaction was running.
  if (localStorage.getItem(LEGACY_RECOVERY_KEY) === raw)
    localStorage.removeItem(LEGACY_RECOVERY_KEY);
}
export async function hasDeviceDrafts() {
  return update((state) => state.drafts.length > 0, "readonly");
}
export async function revokeDevice(signOut = true) {
  await update((state) => {
    state.epoch = crypto.randomUUID();
    state.revoked = signOut;
    state.snapshot = null;
    state.drafts = [];
    state.closed = [];
  });
  try {
    localStorage.removeItem(LEGACY_RECOVERY_KEY);
  } finally {
    announceDeviceChange();
  }
}
export async function activateDevice(sessionTag: string) {
  await update((state) => {
    if (state.sessionTag !== sessionTag) {
      state.epoch = crypto.randomUUID();
      state.revoked = false;
      state.sessionTag = sessionTag;
    }
    assertEpoch(state, state.epoch);
  });
}
export function announceDeviceChange(local = true) {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("fitmin-device");
    channel.postMessage("changed");
    channel.close();
  }
  if (local) window.dispatchEvent(new Event("fitmin-device-change"));
}
export function watchDeviceChanges(callback: () => void) {
  const channel =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("fitmin-device")
      : null;
  if (channel) channel.onmessage = callback;
  window.addEventListener("fitmin-device-change", callback);
  return () => {
    channel?.close();
    window.removeEventListener("fitmin-device-change", callback);
  };
}
