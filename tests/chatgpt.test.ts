import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authorizationUrl,
  validateCallback,
  validateIdToken,
  parseTokens,
  activeChatGptAccount,
  chatGptStatus,
} from "../src/lib/chatgpt-oauth";
import {
  localChatGptEnabled,
  readChatGptStore,
  writeChatGptStore,
  withChatGptLock,
} from "../src/lib/chatgpt-store";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key" };
const claims = {
  iss: "https://auth.openai.com",
  aud: "issued-client",
  sub: "user",
  nonce: "test-nonce",
  exp: Date.now() / 1000 + 300,
  email: "me@example.com",
};
function jwt(patch = {}, alg = "RS256") {
  const body = [
    { alg, kid: "test-key" },
    { ...claims, ...patch },
  ]
    .map((x) => Buffer.from(JSON.stringify(x)).toString("base64url"))
    .join(".");
  return `${body}.${sign("RSA-SHA256", Buffer.from(body), privateKey).toString("base64url")}`;
}
const fetcher: typeof fetch = async (url) =>
  String(url).includes("openid-configuration")
    ? Response.json({ issuer: claims.iss, jwks_uri: `${claims.iss}/jwks` })
    : Response.json({ keys: [jwk] });
test("sign-in uses PKCE, nonce, loopback callback and persistent client for reauthorization", () => {
  const url = new URL(
    authorizationUrl(
      "urn:uuid:host",
      "http://127.0.0.1:3456/auth/callback",
      "state",
      "nonce",
      "verifier",
    ),
  );
  assert.equal(url.origin, "https://auth.openai.com");
  assert.equal(url.searchParams.get("client_id"), "dynamic_agent_client");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("agent_name_hint"), "Fitmin");
  assert.equal(url.searchParams.get("nonce"), "nonce");
  assert.notEqual(url.searchParams.get("code_challenge"), "verifier");
  const returning = new URL(
    authorizationUrl("host", "callback", "state", "nonce", "verifier", {
      id: "id",
      clientId: "issued-client",
      subject: "user",
      email: "me@example.com",
      scopes: [],
      idToken: "secret",
    }),
  );
  assert.equal(returning.searchParams.get("client_id"), "issued-client");
  assert.equal(returning.searchParams.has("id_token_hint"), false);
});
test("callback rejects state mismatch, missing code, dynamic ID and substituted client", () => {
  const callback = new URL(
    "http://127.0.0.1:3456/auth/callback?state=state&code=code&client_id=issued-client",
  );
  assert.deepEqual(validateCallback(callback, "state"), {
    code: "code",
    clientId: "issued-client",
  });
  assert.throws(() => validateCallback(callback, "other"));
  assert.throws(() => validateCallback(callback, "state", "other-client"));
  callback.searchParams.set("client_id", "dynamic_agent_client");
  assert.throws(() => validateCallback(callback, "state"));
  callback.searchParams.delete("code");
  assert.throws(() => validateCallback(callback, "state"));
});
test("ID token verifies signature, issuer, audience, nonce and expiry before account storage", async () => {
  assert.deepEqual(
    await validateIdToken(jwt(), "issued-client", "test-nonce", fetcher),
    { subject: "user", email: "me@example.com" },
  );
  for (const patch of [
    { iss: "https://attacker.test" },
    { aud: "other" },
    { nonce: "other" },
    { exp: 1 },
    { aud: ["issued-client", "other"] },
  ])
    await assert.rejects(
      validateIdToken(jwt(patch), "issued-client", "test-nonce", fetcher),
    );
  await assert.rejects(
    validateIdToken(jwt({}, "none"), "issued-client", "test-nonce", fetcher),
  );
  const tampered = jwt().split(".");
  tampered[1] = Buffer.from(
    JSON.stringify({ ...claims, sub: "attacker" }),
  ).toString("base64url");
  await assert.rejects(
    validateIdToken(tampered.join("."), "issued-client", "test-nonce", fetcher),
  );
});
test("identity alone does not grant subscription inference", () => {
  assert.throws(
    () =>
      parseTokens({
        access_token: "a",
        refresh_token: "r",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "openid profile",
      }),
    /nicht freigegeben/,
  );
});
test("subscription store is owner-only and refresh is serialized without touching API key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fittrack-chatgpt-"));
  process.env.DATABASE_PATH = join(dir, "test.db");
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.env.OPENAI_API_KEY = "must-not-be-used";
  try {
    const account = {
      id: "id",
      clientId: "client",
      subject: "user",
      email: "me@example.com",
      accessToken: "expired",
      refreshToken: "old-refresh",
      scopes: ["chatgpt.tokens.use.direct"],
      expiresAt: 1,
    };
    writeChatGptStore({
      hostId: "urn:uuid:test",
      active: "id",
      accounts: [account],
    });
    assert.equal(
      statSync(join(dir, "chatgpt-connection.json")).mode & 0o777,
      0o600,
    );
    let calls = 0;
    const refresh: typeof fetch = async (_, init) => {
      calls++;
      const body = init!.body as URLSearchParams;
      assert.equal(body.get("client_id"), "client");
      assert.equal(body.get("refresh_token"), "old-refresh");
      return Response.json({
        access_token: "new",
        refresh_token: "rotated",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "chatgpt.tokens.use.direct",
      });
    };
    const results = await Promise.all([
      activeChatGptAccount(refresh),
      activeChatGptAccount(refresh),
    ]);
    assert.equal(calls, 1);
    assert.equal(results[1].accessToken, "new");
    assert.equal(readChatGptStore().accounts[0].refreshToken, "rotated");
    assert.equal(JSON.stringify(chatGptStatus()).includes("rotated"), false);
    process.env.APP_ORIGIN = "https://fitness.example.com";
    assert.equal(localChatGptEnabled(), false);
    assert.equal(chatGptStatus().available, false);
    await assert.rejects(activeChatGptAccount(refresh), /nur lokal/);
  } finally {
    delete process.env.APP_ORIGIN;
    rmSync(dir, { recursive: true, force: true });
  }
});
test("store lock recovers from rejected operations", async () => {
  await assert.rejects(
    withChatGptLock(async () => {
      throw new Error("test");
    }),
  );
  assert.equal(await withChatGptLock(async () => 42), 42);
});
