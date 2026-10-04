export type PreviousSet = {
  weight: number;
  reps: number | null;
  rir: number | null;
  completed: boolean;
};
export type ProgressionInput = {
  baseWeight: number;
  increment: number;
  sets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  previous: PreviousSet[] | null;
};
/** Work sets only. Every prescribed set must reach the upper bound at the same load and target RIR. */
export function recommendWeight(input: ProgressionInput): {
  weight: number;
  reason: string;
  increased: boolean;
} {
  const { baseWeight, increment, sets, minReps, maxReps, targetRir, previous } =
    input;
  if (
    !Number.isFinite(baseWeight) ||
    baseWeight < 0 ||
    baseWeight > 1000 ||
    !Number.isFinite(increment) ||
    increment <= 0 ||
    !Number.isInteger(sets) ||
    sets < 1 ||
    minReps < 1 ||
    maxReps < minReps ||
    targetRir < 0
  )
    throw new Error("Ungültige Progressionsparameter");
  if (!previous?.length)
    return {
      weight: baseWeight,
      reason: "Noch kein Training vorhanden. Startgewicht aus deinem Plan.",
      increased: false,
    };
  const completed = previous.filter((s) => s.completed);
  if (!completed.length)
    return {
      weight: baseWeight,
      reason:
        "Keine abgeschlossenen Sätze im letzten Training. Startgewicht beibehalten.",
      increased: false,
    };
  if (
    completed.some(
      (s) => !Number.isFinite(s.weight) || s.weight < 0 || s.weight > 1000,
    )
  )
    throw new Error("Ungültige historische Gewichte");
  const weight = completed[0].weight;
  if (previous.length !== sets || completed.length !== sets)
    return {
      weight,
      reason:
        "Letztes Training oder Satzanzahl unvollständig. Gewicht beibehalten und alle Sätze absolvieren.",
      increased: false,
    };
  if (completed.some((s) => s.weight !== weight))
    return {
      weight,
      reason:
        "Unterschiedliche Gewichte im letzten Training. Gewicht des ersten Arbeitssatzes beibehalten.",
      increased: false,
    };
  if (completed.some((s) => s.reps === null || s.reps < maxReps))
    return {
      weight,
      reason: `Gewicht beibehalten. Erreiche in allen ${sets} Sätzen mindestens ${maxReps} Wiederholungen.`,
      increased: false,
    };
  if (completed.some((s) => s.rir === null || s.rir < targetRir))
    return {
      weight,
      reason: `Wiederholungsziel erreicht. Für eine Steigerung in allen Sätzen mindestens RIR ${targetRir} halten.`,
      increased: false,
    };
  const next = Math.round((weight + increment) * 100) / 100;
  if (next > 1000)
    return {
      weight,
      reason: "Maximales unterstütztes Gewicht erreicht. Gewicht beibehalten.",
      increased: false,
    };
  return {
    weight: next,
    reason: `Alle ${sets} Sätze mit mindestens ${maxReps} Wiederholungen und RIR ${targetRir} geschafft. +${increment} kg; starte wieder bei ${minReps} Wiederholungen.`,
    increased: true,
  };
}
