import { test } from "node:test";
import assert from "node:assert/strict";
import { updateDictation, dictationText } from "../src/lib/dictation";

const result = (text: string, isFinal = false) => ({
  isFinal,
  0: { transcript: text },
});
import { scenarios } from "./helpers/scenarios";

test("dictation preserves interim tails, final corrections and complete long input", () =>
  scenarios([
    {
      name: "stopping retains the visible interim tail even when the final event omits it",
      run: () => {
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
        assert.equal(
          dictationText(stopped),
          "Bankdrücken mit 80 kg und Klimmzüge",
        );
        assert.equal(
          dictationText(updateDictation(stopped, [], true)),
          dictationText(stopped),
        );
      },
    },
    {
      name: "final corrections replace interim results without duplicating earlier sentences",
      run: () => {
        let segments = updateDictation(
          [],
          [result("Ich möchte Bank drücken")],
          false,
        );
        segments = updateDictation(
          segments,
          [
            result("Ich möchte Bankdrücken", true),
            result("dreimal wöchentlich"),
          ],
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
      },
    },
    {
      name: "interim-only, empty final events and long dictations are never silently truncated",
      run: () => {
        const longText = "Trainingswünsche ".repeat(500).trim();
        let segments = updateDictation([], [result(longText)], false);
        segments = updateDictation(segments, [result("", true)], true);
        assert.equal(dictationText(segments), longText);
        assert.equal(
          dictationText(updateDictation(segments, [], false)),
          longText,
        );
      },
    },
  ]));
