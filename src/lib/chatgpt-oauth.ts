import {
  createHash,
  createPublicKey,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { createServer, type Server } from "node:http";
import { z } from "zod";
import { HttpError } from "./http";
import {
  readChatGptStore,
  writeChatGptStore,
  withChatGptLock,
  requireLocalChatGpt,
  localChatGptEnabled,
  type ChatGptAccount,
} from "./chatgpt-store";

const issuer = "https://auth.openai.com";
const tokenEndpoint = `${issuer}/api/accounts/oauth/token`;
const resource = "https://api.openai.com/v1";
const scopes =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  id_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number().positive(),
  scope: z.string(),
});
export type Tokens = z.infer<typeof tokenSchema>;
export function parseTokens(raw: unknown): Tokens {
  const parsed = tokenSchema.safeParse(raw);
  if (
    !parsed.success ||
    parsed.data.token_type.toLowerCase() !== "bearer" ||
    !parsed.data.scope.split(/\s+/).includes("chatgpt.tokens.use.direct")
  )
    throw new HttpError(
      403,
      "ChatGPT hat die Nutzung deines Abos nicht freigegeben. Es wird keine kostenpflichtige API verwendet.",
    );
  return parsed.data;
}
export async function oauthJson(
  url: string,
  init: RequestInit = {},
  transport: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await transport(url, {
      ...init,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new HttpError(
      502,
      "ChatGPT ist nicht erreichbar. Bitte erneut versuchen.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      502,
      "Die ChatGPT-Anmeldung ist nicht verfügbar oder abgelaufen. Bitte erneut verbinden.",
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new HttpError(
      502,
      "Die Antwort der ChatGPT-Anmeldung konnte nicht gelesen werden.",
    );
  }
}
async function discovery(transport: typeof fetch) {
  const raw = await oauthJson(
    `${issuer}/.well-known/openid-configuration`,
    {},
    transport,
  );
  const data = z
    .object({
      issuer: z.literal(issuer),
      jwks_uri: z.url(),
      revocation_endpoint: z.url().optional(),
    })
    .parse(raw);
  for (const endpoint of [data.jwks_uri, data.revocation_endpoint].filter(
    Boolean,
  )) {
    if (new URL(endpoint!).origin !== issuer)
      throw new HttpError(502, "Unerwartete ChatGPT-Anmeldekonfiguration.");
  }
  return data;
}
export async function validateIdToken(
  token: string,
  clientId: string,
  nonce: string,
  transport: typeof fetch = fetch,
) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (header.alg !== "RS256" || typeof header.kid !== "string")
      throw new Error();
    const config = await discovery(transport);
    const jwks = (await oauthJson(config.jwks_uri, {}, transport)) as {
      keys: Record<string, unknown>[];
    };
    const key = jwks.keys.find(
      (k) =>
        k.kid === header.kid &&
        k.kty === "RSA" &&
        (!k.use || k.use === "sig") &&
        (!k.alg || k.alg === "RS256"),
    );
    if (
      !key ||
      !verify(
        "RSA-SHA256",
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key, format: "jwk" }),
        Buffer.from(parts[2], "base64url"),
      )
    )
      throw new Error();
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const now = Date.now() / 1000;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      claims.iss !== issuer ||
      !audiences.includes(clientId) ||
      (audiences.length > 1 && claims.azp !== clientId) ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      claims.nonce !== nonce ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      (claims.nbf && claims.nbf > now + 60)
    )
      throw new Error();
    return {
      subject: claims.sub as string,
      email: typeof claims.email === "string" ? claims.email : "ChatGPT-Konto",
    };
  } catch {
    throw new HttpError(
      403,
      "Die Identität der ChatGPT-Anmeldung konnte nicht bestätigt werden.",
    );
  }
}
export function authorizationUrl(
  hostId: string,
  redirectUri: string,
  state: string,
  nonce: string,
  verifier: string,
  account?: ChatGptAccount,
) {
  const url = new URL(`${issuer}/api/accounts/authorize`);
  const params: Record<string, string> = {
    client_id: account?.clientId || "dynamic_agent_client",
    ext_agent_host_id: hostId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    resource,
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
  if (!account) params.agent_name_hint = "FitTrack";
  // Do not expose stored ID tokens to the FitTrack browser; the account selector is intentional.
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);
  return url.href;
}
export function validateCallback(
  url: URL,
  state: string,
  expectedClientId?: string,
) {
  const value = url.searchParams.get("state") || "";
  const a = Buffer.from(value),
    b = Buffer.from(state);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new HttpError(403, "Ungültige Anmeldeantwort.");
  if (url.searchParams.has("error"))
    throw new HttpError(
      403,
      "ChatGPT-Anmeldung abgebrochen oder nicht freigegeben.",
    );
  const clientId = url.searchParams.get("client_id") || expectedClientId;
  const code = url.searchParams.get("code");
  if (
    !code ||
    code.length > 8192 ||
    !clientId ||
    clientId.length > 512 ||
    clientId === "dynamic_agent_client" ||
    (expectedClientId && clientId !== expectedClientId)
  )
    throw new HttpError(403, "Unvollständige ChatGPT-Anmeldung.");
  return { clientId, code };
}
function credentials(tokens: Tokens) {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    scopes: tokens.scope.split(/\s+/),
  };
}
type Pending = {
  server: Server;
  timer: ReturnType<typeof setTimeout>;
  cancel: boolean;
};
const runtime = globalThis as typeof globalThis & {
  fittrackOAuth?: Pending;
  fittrackOAuthMessage?: string;
};
export function chatGptStatus() {
  const local = localChatGptEnabled();
  const store = local ? readChatGptStore() : { active: null, accounts: [] };
  const active = store.accounts.find((a) => a.id === store.active);
  return {
    local,
    available: !!active?.accessToken,
    active: store.active,
    accounts: store.accounts.map((a) => ({
      id: a.id,
      label: `${a.email} · ${a.id.slice(0, 6)}`,
      connected: !!a.accessToken,
      model: a.model || "",
    })),
    needsWelcome: !!active?.accessToken && !active.welcomeSeen,
    pending: !!runtime.fittrackOAuth,
    message: runtime.fittrackOAuthMessage || "",
  };
}
export async function startChatGptLogin(accountId?: string) {
  requireLocalChatGpt();
  return withChatGptLock(async () => {
    if (runtime.fittrackOAuth)
      throw new HttpError(
        409,
        "Eine ChatGPT-Anmeldung läuft bereits. Schließe sie ab oder brich sie ab.",
      );
    const store = readChatGptStore();
    if (!store.hostId) {
      store.hostId = `urn:uuid:${randomUUID()}`;
      writeChatGptStore(store);
    }
    const account = accountId
      ? store.accounts.find((a) => a.id === accountId)
      : undefined;
    if (accountId && !account)
      throw new HttpError(400, "ChatGPT-Konto nicht gefunden.");
    const state = randomBytes(32).toString("base64url"),
      nonce = randomBytes(32).toString("base64url"),
      verifier = randomBytes(48).toString("base64url");
    let used = false;
    let redirectUri = "";
    const server = createServer(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'",
      );
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (
        req.method !== "GET" ||
        url.pathname !== "/auth/callback" ||
        req.headers.host !== new URL(redirectUri).host ||
        used
      ) {
        res.writeHead(400);
        res.end("Anfrage nicht erlaubt.");
        return;
      }
      // Unrelated requests must not consume a legitimate pending authorization.
      if (url.searchParams.get("state") !== state) {
        res.writeHead(403);
        res.end("Ungültige Anmeldeantwort.");
        return;
      }
      used = true;
      const pending = runtime.fittrackOAuth;
      try {
        const { clientId, code } = validateCallback(
          url,
          state,
          account?.clientId,
        );
        const tokens = parseTokens(
          await oauthJson(tokenEndpoint, {
            method: "POST",
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: clientId,
              code,
              code_verifier: verifier,
              redirect_uri: redirectUri,
              resource,
            }),
          }),
        );
        if (!tokens.id_token)
          throw new HttpError(
            403,
            "ChatGPT hat keine bestätigbare Identität geliefert.",
          );
        const identity = await validateIdToken(
          tokens.id_token,
          clientId,
          nonce,
        );
        if (account && identity.subject !== account.subject)
          throw new HttpError(
            403,
            "Bitte das zuvor ausgewählte ChatGPT-Konto verwenden.",
          );
        await withChatGptLock(async () => {
          if (!pending || pending.cancel)
            throw new HttpError(400, "Anmeldung abgebrochen.");
          const latest = readChatGptStore();
          const existing = latest.accounts.find(
            (a) => a.clientId === clientId && a.subject === identity.subject,
          );
          const next = {
            id: existing?.id || randomUUID(),
            clientId,
            ...identity,
            ...credentials(tokens),
            model: existing?.model,
            welcomeSeen: existing?.welcomeSeen,
          };
          latest.accounts = [
            ...latest.accounts.filter((a) => a.id !== next.id),
            next,
          ];
          latest.active = next.id;
          writeChatGptStore(latest);
        });
        runtime.fittrackOAuthMessage =
          "ChatGPT verbunden. Du verwendest dein ChatGPT-Abo. Prüfe dessen Nutzungslimits und Guthaben-Einstellungen in ChatGPT.";
        res.end(
          "ChatGPT verbunden. Du kannst dieses Fenster schließen und zu FitTrack zurückkehren.",
        );
      } catch (e) {
        runtime.fittrackOAuthMessage =
          e instanceof HttpError
            ? e.message
            : "ChatGPT-Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
        res.writeHead(400);
        res.end(runtime.fittrackOAuthMessage);
      } finally {
        if (pending) clearTimeout(pending.timer);
        if (runtime.fittrackOAuth === pending)
          runtime.fittrackOAuth = undefined;
        server.close();
      }
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", () =>
        reject(
          new HttpError(
            503,
            "Lokale ChatGPT-Anmeldung konnte nicht gestartet werden.",
          ),
        ),
      );
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new HttpError(503, "Anmeldung nicht verfügbar.");
    redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
    const pending: Pending = {
      server,
      cancel: false,
      timer: setTimeout(() => {
        pending.cancel = true;
        server.close();
        server.closeAllConnections();
        if (runtime.fittrackOAuth === pending) {
          runtime.fittrackOAuth = undefined;
          runtime.fittrackOAuthMessage =
            "Anmeldung abgelaufen. Bitte erneut verbinden.";
        }
      }, 5 * 60000),
    };
    pending.timer.unref();
    server.unref();
    runtime.fittrackOAuth = pending;
    runtime.fittrackOAuthMessage = "";
    return {
      url: authorizationUrl(
        store.hostId,
        redirectUri,
        state,
        nonce,
        verifier,
        account,
      ),
    };
  });
}
export function cancelChatGptLogin() {
  const pending = runtime.fittrackOAuth;
  if (pending) {
    pending.cancel = true;
    clearTimeout(pending.timer);
    pending.server.close();
    pending.server.closeAllConnections();
    runtime.fittrackOAuth = undefined;
  }
}
export async function activeChatGptAccount(transport: typeof fetch = fetch) {
  requireLocalChatGpt();
  return withChatGptLock(async () => {
    const store = readChatGptStore();
    const account = store.accounts.find((a) => a.id === store.active);
    if (!account?.accessToken || !account.refreshToken)
      throw new HttpError(
        409,
        "Bitte zuerst mit ChatGPT verbinden oder einen Vorschlag aus ChatGPT importieren.",
      );
    if ((account.expiresAt || 0) > Date.now() + 60000) return account;
    try {
      const tokens = parseTokens(
        await oauthJson(
          tokenEndpoint,
          {
            method: "POST",
            body: new URLSearchParams({
              grant_type: "refresh_token",
              client_id: account.clientId,
              refresh_token: account.refreshToken,
              resource,
            }),
          },
          transport,
        ),
      );
      Object.assign(account, credentials(tokens), {
        idToken: tokens.id_token || account.idToken,
      });
      writeChatGptStore(store);
      return account;
    } catch {
      throw new HttpError(
        409,
        "ChatGPT-Verbindung abgelaufen oder nicht erreichbar. Bitte erneut verbinden. Es erfolgt keine API-Abrechnung.",
      );
    }
  });
}
export async function disconnectChatGpt(accountId: string) {
  requireLocalChatGpt();
  cancelChatGptLogin();
  return withChatGptLock(async () => {
    const store = readChatGptStore();
    const account = store.accounts.find((a) => a.id === accountId);
    if (!account) throw new HttpError(400, "ChatGPT-Konto nicht gefunden.");
    let revoked = !account.refreshToken;
    try {
      if (account.refreshToken) {
        const config = await discovery(fetch);
        if (config.revocation_endpoint) {
          const res = await fetch(config.revocation_endpoint, {
            method: "POST",
            body: new URLSearchParams({
              token: account.refreshToken,
              token_type_hint: "refresh_token",
              client_id: account.clientId,
            }),
            signal: AbortSignal.timeout(10000),
            redirect: "error",
          });
          revoked = res.ok;
        }
      }
    } catch {
      /* Clear local credentials even when remote revocation fails. */
    }
    delete account.accessToken;
    delete account.refreshToken;
    delete account.idToken;
    delete account.expiresAt;
    if (store.active === accountId) store.active = null;
    writeChatGptStore(store);
    return {
      message: revoked
        ? "ChatGPT-Verbindung getrennt."
        : "Lokal getrennt. Die Trennung bei ChatGPT konnte nicht bestätigt werden. Entferne FitTrack auch in den ChatGPT-Einstellungen.",
    };
  });
}
export async function selectChatGptAccount(accountId: string, model?: string) {
  requireLocalChatGpt();
  return withChatGptLock(async () => {
    const store = readChatGptStore();
    const account = store.accounts.find((a) => a.id === accountId);
    if (!account?.accessToken)
      throw new HttpError(409, "Bitte dieses Konto erneut verbinden.");
    store.active = accountId;
    if (model) account.model = model;
    writeChatGptStore(store);
  });
}

export async function acknowledgeChatGptWelcome() {
  return withChatGptLock(async () => {
    const store = readChatGptStore();
    const active = store.accounts.find((a) => a.id === store.active);
    if (active) {
      active.welcomeSeen = true;
      writeChatGptStore(store);
    }
  });
}
