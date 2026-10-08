import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  validSession,
  digest,
  consumeLoginAttempt,
  checkOrigin,
  SESSION_SECONDS,
} from "../src/lib/security";
import { scenarios } from "./helpers/scenarios";

test("passwords, sessions, login throttling and origin boundaries", () =>
  scenarios([
    {
      name: "password hashes are salted and reject wrong passwords",
      run: () => {
        const hash = hashPassword("my long test password");
        assert.equal(verifyPassword("my long test password", hash), true);
        assert.equal(verifyPassword("wrong", hash), false);
        assert.notEqual(hash, hashPassword("my long test password"));
        assert.equal(verifyPassword("abc", "bad"), false);
      },
    },
    {
      name: "sessions expire, can be revoked and only hashes are stored",
      run: () => {
        const { sqlite } = openDatabase(":memory:");
        const token = createSession(sqlite, 1000);
        assert.equal(validSession(sqlite, token, 2000), true);
        assert.equal(
          validSession(sqlite, token, 1000 + SESSION_SECONDS * 1000),
          false,
        );
        assert.equal(validSession(sqlite, "forged", 2000), false);
        assert.ok(
          sqlite
            .prepare("SELECT 1 FROM sessions WHERE token_hash = ?")
            .get(digest(token)),
        );
        sqlite.prepare("DELETE FROM sessions").run();
        assert.equal(validSession(sqlite, token, 2000), false);
        sqlite.close();
      },
    },
    {
      name: "login limiting survives independent requests and resets after 15 minutes",
      run: () => {
        const { sqlite } = openDatabase(":memory:");
        for (let i = 0; i < 10; i++)
          assert.equal(consumeLoginAttempt(sqlite, 1000), true);
        assert.equal(consumeLoginAttempt(sqlite, 1001), false);
        assert.equal(consumeLoginAttempt(sqlite, 901000), true);
        sqlite.close();
      },
    },
    {
      name: "origin must match configured origin exactly",
      run: () => {
        process.env.APP_ORIGIN = "https://fitness.example";
        assert.equal(checkOrigin(null), false);
        assert.equal(checkOrigin("https://evil.example"), false);
        assert.equal(
          checkOrigin("https://fitness.example.evil.example"),
          false,
        );
        assert.equal(checkOrigin("https://fitness.example"), true);
      },
    },
  ]));
