import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { readJson } from "../src/lib/http";
import { setSchema, finishSchema } from "../src/lib/workouts";
import { randomUUID } from "node:crypto";
import {
  readLoginInput,
  loginErrorMessage,
  loginRedirect,
} from "../src/lib/login";
import { scenarios } from "./helpers/scenarios";

test("HTTP and workout validation preserve incomplete drafts and reject invalid completion", () =>
  scenarios([
    {
      name: "native and JSON login bodies are bounded, reject ambiguous credentials and never echo passwords",
      run: async () => {
        const password = "Sicher + & = ä 🙂 Passwort";
        for (const type of [
          "application/json",
          "application/x-www-form-urlencoded; charset=UTF-8",
        ]) {
          const body = type.startsWith("application/json")
            ? JSON.stringify({ password })
            : new URLSearchParams({ password }).toString();
          assert.deepEqual(
            await readLoginInput(
              new Request("http://localhost/api/auth/login", {
                method: "POST",
                headers: { "content-type": type },
                body,
              }),
            ),
            { password },
          );
        }
        for (const body of [
          "",
          "password=",
          "password=one&password=two",
          "password=one&next=https://evil.example",
          "password=" + "x".repeat(300),
          "password=" + "x".repeat(5000),
        ]) {
          await assert.rejects(
            readLoginInput(
              new Request("http://localhost/api/auth/login?password=ignored", {
                method: "POST",
                headers: {
                  "content-type": "application/x-www-form-urlencoded",
                },
                body,
              }),
            ),
          );
        }
        await assert.rejects(
          readLoginInput(
            new Request("http://localhost/api/auth/login", {
              method: "POST",
              headers: { "content-type": "text/plain" },
              body: password,
            }),
          ),
        );
        for (const code of [
          "__proto__",
          "constructor",
          "<script>alert(1)</script>",
          ["invalid"],
          undefined,
        ])
          assert.equal(loginErrorMessage(code), "");
        assert.equal(
          loginErrorMessage("invalid"),
          "Passwort ist nicht korrekt.",
        );
        assert.equal(loginRedirect().headers.get("location"), "/");
        assert.equal(
          loginRedirect("invalid").headers.get("location"),
          "/login?error=invalid",
        );
        assert.equal(loginRedirect("invalid").status, 303);
        assert.equal(await loginRedirect("invalid").text(), "");
      },
    },
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
