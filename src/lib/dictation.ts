export type SpeechResult = { isFinal: boolean; 0: { transcript: string } };

// Results are cumulative, not deltas. Replace a segment when the browser
// corrects it; after stop, keep any trailing interim segments it omits.
export function updateDictation(
  previous: string[],
  results: ArrayLike<SpeechResult>,
  stopping: boolean,
): string[] {
  if (!results.length) return previous;
  const next = stopping ? [...previous] : [];
  Array.from(results).forEach((result, index) => {
    const text = result[0].transcript.trim();
    if (text || !stopping) next[index] = text;
  });
  return next;
}

export const dictationText = (segments: string[]) =>
  segments.filter(Boolean).join(" ");
