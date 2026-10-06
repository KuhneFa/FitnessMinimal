import { test } from "node:test";
import assert from "node:assert/strict";
import { updateDictation, dictationText } from "../src/lib/dictation";

const result = (text: string, isFinal = false) => ({
  isFinal,
  0: { transcript: text },
});

test("stopping retains the visible interim tail even when the final event omits it", () => {
  const live = updateDictation(
    [],
    [result("Bankdrücken", true), result("und Klimmzüge")],
    false,
  );
  const stopped = updateDictation(
    live,
    [result("Bankdrücken mit 80 kg", true)],
    true,
  );
  assert.equal(dictationText(stopped), "Bankdrücken mit 80 kg und Klimmzüge");
  assert.equal(
    dictationText(updateDictation(stopped, [], true)),
    dictationText(stopped),
  );
});

test("final corrections replace interim results without duplicating earlier sentences", () => {
  let segments = updateDictation(
    [],
    [result("Ich möchte Bank drücken")],
    false,
  );
  segments = updateDictation(
    segments,
    [result("Ich möchte Bankdrücken", true), result("dreimal wöchentlich")],
    true,
  );
  segments = updateDictation(
    segments,
    [
      result("Ich möchte Bankdrücken", true),
      result("zweimal wöchentlich", true),
    ],
    true,
  );
  assert.equal(
    dictationText(segments),
    "Ich möchte Bankdrücken zweimal wöchentlich",
  );
});

test("interim-only, empty final events and long dictations are never silently truncated", () => {
  const longText = "Trainingswünsche ".repeat(500).trim();
  let segments = updateDictation([], [result(longText)], false);
  segments = updateDictation(segments, [result("", true)], true);
  assert.equal(dictationText(segments), longText);
  assert.equal(dictationText(updateDictation(segments, [], false)), longText);
});
