import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { readJson } from "../src/lib/http";
import { setSchema, finishSchema } from "../src/lib/workouts";
import { randomUUID } from "node:crypto";
import { scenarios } from "./helpers/scenarios";

test("HTTP and workout validation preserve incomplete drafts and reject invalid completion", () =>
  scenarios([
    {
      name: "JSON rejects oversized bodies, wrong content types, malformed and invalid values",
      run: async () => {
        for (const request of [
          new Request("http://test", { method: "POST", body: "{}" }),
          new Request("http://test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
          }),
          new Request("http://test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "x".repeat(40000) }),
          }),
          new Request("http://test", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: 42 }),
          }),
        ])
          await assert.rejects(
            readJson(request, z.object({ name: z.string() })),
          );
      },
    },
    {
      name: "drafts allow incomplete values but completed sets require reps and RIR",
      run: () => {
        const draft = {
          weight: 80,
          reps: null,
          rir: null,
          completed: false,
          version: 0,
          mutationId: randomUUID(),
        };
        assert.equal(setSchema.safeParse(draft).success, true);
        assert.equal(
          setSchema.safeParse({ ...draft, completed: true }).success,
          false,
        );
        assert.equal(
          setSchema.safeParse({ ...draft, reps: 10, rir: 0, completed: true })
            .success,
          true,
        );
        for (const patch of [
          { weight: Infinity },
          { weight: -1 },
          { reps: 1.5 },
          { rir: 11 },
          { version: -1 },
          { mutationId: "bad" },
        ])
          assert.equal(
            setSchema.safeParse({ ...draft, ...patch }).success,
            false,
          );
      },
    },
    {
      name: "finish reviews and note length are constrained",
      run: () => {
        const data = {
          fatigue: 3,
          performance: 3,
          note: "",
          allowIncomplete: false,
          versions: {},
        };
        assert.equal(finishSchema.safeParse(data).success, true);
        assert.equal(
          finishSchema.safeParse({ ...data, fatigue: 6 }).success,
          false,
        );
        assert.equal(
          finishSchema.safeParse({ ...data, note: "x".repeat(2001) }).success,
          false,
        );
      },
    },
  ]));
