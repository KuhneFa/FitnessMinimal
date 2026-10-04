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
test("80 x 10 x 3 at target RIR recommends 82.5", () => {
  const result = recommendWeight(base);
  assert.equal(result.weight, 82.5);
  assert.equal(result.increased, true);
  assert.match(result.reason, /2.5/);
});
test("first workout uses plan weight", () =>
  assert.equal(recommendWeight({ ...base, previous: null }).weight, 80));
test("empty previous workout uses plan weight", () =>
  assert.equal(recommendWeight({ ...base, previous: [] }).increased, false));
test("one set below rep ceiling prevents increase", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s, i) => ({
        ...s,
        reps: i === 2 ? 9 : 10,
      })),
    }).weight,
    80,
  ));
test("insufficient RIR prevents increase", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s, i) => ({ ...s, rir: i === 1 ? 1 : 2 })),
    }).increased,
    false,
  ));
test("missing RIR prevents increase", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s) => ({ ...s, rir: null })),
    }).increased,
    false,
  ));
test("unfinished sets prevent increase", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s, i) => ({ ...s, completed: i !== 2 })),
    }).increased,
    false,
  ));
test("changed set count prevents increase", () =>
  assert.equal(recommendWeight({ ...base, sets: 4 }).increased, false));
test("mixed weights use first completed working load without increase", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s, i) => ({
        ...s,
        weight: i === 2 ? 75 : 80,
      })),
    }).weight,
    80,
  ));
test("all unfinished uses plan weight", () =>
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
  ));
test("decimal increments avoid floating point artifacts", () =>
  assert.equal(
    recommendWeight({
      ...base,
      increment: 0.2,
      previous: base.previous!.map((s) => ({ ...s, weight: 10.1 })),
    }).weight,
    10.3,
  ));
test("zero weight and RIR zero supported", () =>
  assert.equal(
    recommendWeight({
      ...base,
      targetRir: 0,
      previous: base.previous!.map((s) => ({ ...s, weight: 0, rir: 0 })),
    }).weight,
    2.5,
  ));
test("above target reps still qualifies", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s) => ({ ...s, reps: 12 })),
    }).increased,
    true,
  ));
test("upper supported load never exceeded", () =>
  assert.equal(
    recommendWeight({
      ...base,
      previous: base.previous!.map((s) => ({ ...s, weight: 1000 })),
    }).weight,
    1000,
  ));
test("invalid parameters are rejected", () => {
  for (const patch of [
    { increment: 0 },
    { increment: -1 },
    { baseWeight: NaN },
    { minReps: 12, maxReps: 8 },
    { sets: 0 },
  ])
    assert.throws(() => recommendWeight({ ...base, ...patch }));
});
test("input is never mutated", () => {
  const before = structuredClone(base);
  recommendWeight(base);
  assert.deepEqual(base, before);
});
