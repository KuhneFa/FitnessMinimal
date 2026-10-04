export type TimerState = {
  timerEnd: number | null;
  timerRemaining: number | null;
  timerVersion: number;
};
export type TimerAction = "pause" | "resume" | "skip" | "add30";
export function remaining(timer: TimerState, now: number) {
  return Math.max(
    0,
    timer.timerEnd !== null
      ? Math.ceil((timer.timerEnd - now) / 1000)
      : timer.timerRemaining || 0,
  );
}
export function changeTimer(
  timer: TimerState,
  action: TimerAction,
  now: number,
): TimerState {
  const seconds = remaining(timer, now);
  const version = timer.timerVersion + 1;
  if (action === "skip")
    return { timerEnd: null, timerRemaining: null, timerVersion: version };
  if (action === "pause")
    return { timerEnd: null, timerRemaining: seconds, timerVersion: version };
  if (action === "resume")
    return {
      timerEnd: seconds ? now + seconds * 1000 : null,
      timerRemaining: null,
      timerVersion: version,
    };
  const next = Math.min(1800, seconds + 30);
  return timer.timerRemaining !== null
    ? { timerEnd: null, timerRemaining: next, timerVersion: version }
    : {
        timerEnd: now + next * 1000,
        timerRemaining: null,
        timerVersion: version,
      };
}
