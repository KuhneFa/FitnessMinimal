import type { ModelReply } from "./ai-contract";
import type { ChatGptAccount } from "./chatgpt-store";
import { activeChatGptAccount } from "./chatgpt-oauth";
import { HttpError, errorResponse, json } from "./http";
import { PlanGenerationError, requestStructuredWithChatGpt } from "./openai";

export type StructuredRequest<T> = {
  instructions: string;
  input: string;
  name: string;
  schema: Record<string, unknown>;
  parse: (text: string) => T;
};
export type Generated<T> = { proposal: T; reply: ModelReply };
export type ProviderFailureCode =
  | "connection_required"
  | "permission_denied"
  | "invalid_request"
  | "limited"
  | "invalid_response"
  | "unavailable";

// These are capabilities implemented by Fitmin's adapter, not promises about
// every model in an account's catalog. Extend only when supported end to end.
export const chatGptProviderInfo = {
  id: "chatgpt",
  name: "ChatGPT",
  capabilities: { structuredText: true, images: false, audio: false },
  billing: "chatgpt-account-settings",
  paidApiFallback: false,
  automaticRetry: false,
  costSettingsVerifiable: false,
} as const;

export interface AiProvider {
  readonly info: {
    id: string;
    name: string;
    capabilities: { structuredText: boolean; images: boolean; audio: boolean };
    billing: string;
    paidApiFallback: false;
    automaticRetry: false;
    costSettingsVerifiable: boolean;
  };
  // Resolve/validate credentials before charging the application's request
  // budget. The prepared session captures one account/model for this request.
  prepare(): Promise<{
    generate<T>(request: StructuredRequest<T>): Promise<Generated<T>>;
  }>;
}

export class AiProviderError extends HttpError {
  constructor(
    status: number,
    message: string,
    public code: ProviderFailureCode,
    public reply?: ModelReply,
  ) {
    super(status, message);
  }
}

function providerError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof HttpError) {
    const code: ProviderFailureCode =
      error.status === 429
        ? "limited"
        : error.status === 401 || error.status === 409
          ? "connection_required"
          : error.status === 403
            ? "permission_denied"
            : error.status === 400
              ? "invalid_request"
              : error instanceof PlanGenerationError && error.status === 502
                ? "invalid_response"
                : "unavailable";
    return new AiProviderError(
      error.status,
      error.message,
      code,
      error instanceof PlanGenerationError ? error.reply : undefined,
    );
  }
  // Unknown errors can contain provider payloads or credentials. Do not echo.
  return new AiProviderError(
    502,
    "Die KI-Verbindung ist gerade nicht verfügbar. Deine Angaben bleiben erhalten.",
    "unavailable",
  );
}

export function createChatGptProvider(
  resolveAccount: () => Promise<ChatGptAccount> = activeChatGptAccount,
  transport: typeof fetch = fetch,
): AiProvider {
  return {
    info: chatGptProviderInfo,
    async prepare() {
      try {
        const account = { ...(await resolveAccount()) };
        if (!account.accessToken)
          throw new HttpError(409, "Bitte zuerst mit ChatGPT verbinden.");
        if (!account.scopes.includes("chatgpt.tokens.use.direct"))
          throw new HttpError(
            403,
            "Dieses Konto hat die Modellnutzung für Fitmin nicht freigegeben. Die Anmeldung allein reicht dafür nicht aus.",
          );
        if (!account.model)
          throw new HttpError(
            400,
            "Bitte ein verfügbares ChatGPT-Modell auswählen.",
          );
        return {
          async generate<T>(request: StructuredRequest<T>) {
            try {
              return await requestStructuredWithChatGpt(
                request,
                account,
                transport,
              );
            } catch (error) {
              throw providerError(error);
            }
          },
        };
      } catch (error) {
        throw providerError(error);
      }
    },
  };
}

export async function requestStructured<T>(
  request: StructuredRequest<T>,
  beforeSend: () => void,
  provider: AiProvider = createChatGptProvider(),
): Promise<Generated<T>> {
  const session = await provider.prepare();
  beforeSend();
  return session.generate(request);
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiProviderError)
    return json(
      {
        error: error.message,
        code: error.code,
        ...(error.reply ? { reply: error.reply } : {}),
      },
      error.status,
    );
  // Manual import uses the same inspectable public response as before.
  if (error instanceof PlanGenerationError)
    return json(
      { error: error.message, code: "invalid_response", reply: error.reply },
      error.status,
    );
  return errorResponse(error);
}
