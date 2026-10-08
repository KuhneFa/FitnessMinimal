import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendWeight, type ProgressionInput } from "../src/lib/progression";
const base: ProgressionInput = {
  baseWeight: 80,
  increment: 2.5,
  sets: 3,
  minReps: 8,
  maxReps: 10,
  targetRir: 2,
  previous: Array.from({ length: 3 }, () => ({
    weight: 80,
    reps: 10,
    rir: 2,
    completed: true,
  })),
};
import { scenarios } from "./helpers/scenarios";

test("double progression decision matrix, numeric boundaries and immutability", () =>
  scenarios([
    {
      name: "80 x 10 x 3 at target RIR recommends 82.5",
      run: () => {
        const result = recommendWeight(base);
        assert.equal(result.weight, 82.5);
        assert.equal(result.increased, true);
        assert.match(result.reason, /2.5/);
      },
    },
    {
      name: "first workout uses plan weight",
      run: () =>
        assert.equal(recommendWeight({ ...base, previous: null }).weight, 80),
    },
    {
      name: "empty previous workout uses plan weight",
      run: () =>
        assert.equal(
          recommendWeight({ ...base, previous: [] }).increased,
          false,
        ),
    },
    {
      name: "one set below rep ceiling prevents increase",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s, i) => ({
              ...s,
              reps: i === 2 ? 9 : 10,
            })),
          }).weight,
          80,
        ),
    },
    {
      name: "insufficient RIR prevents increase",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s, i) => ({
              ...s,
              rir: i === 1 ? 1 : 2,
            })),
          }).increased,
          false,
        ),
    },
    {
      name: "missing RIR prevents increase",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s) => ({ ...s, rir: null })),
          }).increased,
          false,
        ),
    },
    {
      name: "unfinished sets prevent increase",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s, i) => ({
              ...s,
              completed: i !== 2,
            })),
          }).increased,
          false,
        ),
    },
    {
      name: "changed set count prevents increase",
      run: () =>
        assert.equal(recommendWeight({ ...base, sets: 4 }).increased, false),
    },
    {
      name: "mixed weights use first completed working load without increase",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s, i) => ({
              ...s,
              weight: i === 2 ? 75 : 80,
            })),
          }).weight,
          80,
        ),
    },
    {
      name: "all unfinished uses plan weight",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s) => ({
              ...s,
              completed: false,
              weight: 90,
            })),
          }).weight,
          80,
        ),
    },
    {
      name: "decimal increments avoid floating point artifacts",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            increment: 0.2,
            previous: base.previous!.map((s) => ({ ...s, weight: 10.1 })),
          }).weight,
          10.3,
        ),
    },
    {
      name: "zero weight and RIR zero supported",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            targetRir: 0,
            previous: base.previous!.map((s) => ({ ...s, weight: 0, rir: 0 })),
          }).weight,
          2.5,
        ),
    },
    {
      name: "above target reps still qualifies",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s) => ({ ...s, reps: 12 })),
          }).increased,
          true,
        ),
    },
    {
      name: "upper supported load never exceeded",
      run: () =>
        assert.equal(
          recommendWeight({
            ...base,
            previous: base.previous!.map((s) => ({ ...s, weight: 1000 })),
          }).weight,
          1000,
        ),
    },
    {
      name: "invalid parameters are rejected",
      run: () => {
        for (const patch of [
          { increment: 0 },
          { increment: -1 },
          { baseWeight: NaN },
          { minReps: 12, maxReps: 8 },
          { sets: 0 },
        ])
          assert.throws(() => recommendWeight({ ...base, ...patch }));
      },
    },
    {
      name: "input is never mutated",
      run: () => {
        const before = structuredClone(base);
        recommendWeight(base);
        assert.deepEqual(base, before);
      },
    },
  ]));
