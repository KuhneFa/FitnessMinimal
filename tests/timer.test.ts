import { test } from "node:test";
import assert from "node:assert/strict";
import { remaining, changeTimer } from "../src/lib/timer";
import { scenarios } from "./helpers/scenarios";

test("timer lifecycle across backgrounding, pause/resume and duration limits", () =>
  scenarios([
    {
      name: "timer uses elapsed wall clock through background and expiry",
      run: () => {
        const t = { timerEnd: 121000, timerRemaining: null, timerVersion: 0 };
        assert.equal(remaining(t, 1000), 120);
        assert.equal(remaining(t, 61000), 60);
        assert.equal(remaining(t, 200000), 0);
      },
    },
    {
      name: "pause, add 30, resume and skip preserve duration",
      run: () => {
        const paused = changeTimer(
          { timerEnd: 121000, timerRemaining: null, timerVersion: 0 },
          "pause",
          61000,
        );
        assert.equal(remaining(paused, 1000000), 60);
        const added = changeTimer(paused, "add30", 1000000);
        assert.equal(remaining(added, 1000000), 90);
        const resumed = changeTimer(added, "resume", 1000000);
        assert.equal(remaining(resumed, 1030000), 60);
        assert.equal(
          remaining(changeTimer(resumed, "skip", 1030000), 1030000),
          0,
        );
      },
    },
    {
      name: "running add30 caps timer at 30 minutes",
      run: () => {
        const t = changeTimer(
          { timerEnd: 1801000, timerRemaining: null, timerVersion: 0 },
          "add30",
          1000,
        );
        assert.equal(remaining(t, 1000), 1800);
      },
    },
  ]));
