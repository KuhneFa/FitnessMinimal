import { z } from "zod";
import { HttpError } from "./http";
import {
  type AssistantInput,
  type GeneratedPlan,
  type ModelReply,
} from "./ai-contract";
import { planInstructions, planJsonSchema, planRequest } from "./plan-prompt";
import { activeChatGptAccount } from "./chatgpt-oauth";
import type { ChatGptAccount } from "./chatgpt-store";
import {
  modelReply,
  parsePlanResponse,
  PlanResponseError,
} from "./plan-response";

// Subscription OAuth only. OPENAI_API_KEY is deliberately never read by this app.
export async function chatGptModels(
  account: ChatGptAccount,
  transport: typeof fetch = fetch,
) {
  const response = await transport("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${account.accessToken}` },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new HttpError(
      409,
      "ChatGPT-Modelle sind nicht verfügbar. Bitte erneut verbinden oder den Import nutzen.",
    );
  const parsed = z
    .object({
      models: z.array(
        z.object({
          slug: z.string(),
          display_name: z.string(),
          visibility: z.string(),
        }),
      ),
    })
    .safeParse(await response.json());
  if (!parsed.success)
    throw new HttpError(
      502,
      "Die ChatGPT-Modellliste konnte nicht gelesen werden.",
    );
  return parsed.data.models
    .filter((m) => m.visibility === "list")
    .map((m) => ({ id: m.slug, name: m.display_name }));
}
export function chatGptError(status: number, raw: unknown) {
  // Only interpret known codes, never display provider text (may contain input
  // or credentials). HTTP failures and terminal SSE failures use the same map.
  const parsed = z
    .object({
      code: z.string().optional(),
      error: z.object({ code: z.string().optional() }).nullish(),
      response: z
        .object({ error: z.object({ code: z.string().optional() }).nullish() })
        .optional(),
    })
    .safeParse(raw);
  const code = parsed.success
    ? parsed.data.error?.code ||
      parsed.data.response?.error?.code ||
      parsed.data.code
    : undefined;
  const messages: Record<string, [number, string]> = {
    subscription_sharing_usage_limit_exceeded: [
      429,
      "OpenAI meldet ein Nutzungslimit für die freigegebene ChatGPT-Nutzung. Das kann auch ein Limit für diese App sein und bedeutet nicht, dass dein gesamtes Abo aufgebraucht ist. Prüfe „ChatGPT-Nutzung verwalten“.",
    ],
    subscription_sharing_usage_unavailable: [
      503,
      "OpenAI kann die Verfügbarkeit deiner Abo-Nutzung gerade nicht prüfen. Deine Verbindung bleibt erhalten. Bitte später erneut versuchen oder über ChatGPT kopieren und importieren.",
    ],
    subscription_sharing_user_not_eligible: [
      403,
      "OpenAI gibt die Abo-Nutzung für das gewählte Konto oder dessen Workspace nicht frei. Nutze den ChatGPT-Kopier-/Importweg; eine erneute Anmeldung allein behebt diese Einschränkung nicht.",
    ],
    subscription_sharing_unsupported_capability: [
      400,
      "OpenAI unterstützt das gewählte Modell oder eine angefragte Funktion über diese Abo-Verbindung nicht. Wähle ein anderes verfügbares Modell oder nutze den ChatGPT-Import.",
    ],
    subscription_sharing_route_not_supported: [
      403,
      "OpenAI unterstützt diesen Anfrageweg für die Abo-Verbindung nicht. Nutze vorerst den ChatGPT-Import.",
    ],
    subscription_sharing_invalid_user: [
      401,
      "OpenAI konnte die Kontozuordnung dieser ChatGPT-Verbindung nicht prüfen. Bitte die Verbindung prüfen; deine Angaben bleiben erhalten.",
    ],
    chatpass_v2_scope_not_authorized: [
      403,
      "Der ChatGPT-Verbindung fehlt die Berechtigung für diese Anfrage. Nutze den ChatGPT-Import; API-Guthaben löst dieses Berechtigungsproblem nicht.",
    ],
    chatpass_v2_invalid_authorization_context: [
      403,
      "OpenAI kann die Freigabe dieser ChatGPT-Verbindung nicht zuordnen. Nutze vorerst den ChatGPT-Import.",
    ],
    rate_limit_exceeded: [
      429,
      "OpenAI meldet ein vorübergehendes Anfragelimit. Bitte etwas warten und erneut versuchen. Das ist keine Bestätigung eines aufgebrauchten ChatGPT-Abos.",
    ],
    insufficient_quota: [
      429,
      "OpenAI meldet fehlendes Kontingent für diese Anfrage. Die App verwendet deinen Abo-Zugang; daraus lässt sich kein verbrauchtes Plus-Abo ableiten. Nutze vorerst den ChatGPT-Import.",
    ],
  };
  const known =
    code && Object.hasOwn(messages, code) ? messages[code] : undefined;
  if (known)
    return new HttpError(
      known[0],
      `${known[1]} Fehlercode: ${code}. Es wird keine kostenpflichtige API verwendet.`,
    );
  if (status === 429)
    return new HttpError(
      429,
      "OpenAI hat die Anfrage begrenzt (HTTP 429), ohne einen eindeutig zuordenbaren Fehlercode zu liefern. Ob ein Abo- oder Anfragelimit vorliegt, ist unbekannt. Bitte später erneut versuchen oder den ChatGPT-Import nutzen. Es wird keine kostenpflichtige API verwendet.",
    );
  if (status === 401 || status === 403)
    return new HttpError(
      409,
      "OpenAI hat den Zugriff abgelehnt. Bitte deine ChatGPT-Verbindung prüfen oder den ChatGPT-Import nutzen. Deine Angaben bleiben erhalten.",
    );
  return new HttpError(
    502,
    "Die ChatGPT-Anfrage ist fehlgeschlagen. Deine Angaben bleiben erhalten. Bitte später erneut versuchen oder den ChatGPT-Import nutzen.",
  );
}
export class PlanGenerationError extends HttpError {
  constructor(
    status: number,
    message: string,
    public reply: ModelReply,
  ) {
    super(status, message);
  }
}
const messageSchema = z.object({
  type: z.string(),
  content: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
        refusal: z.string().optional(),
      }),
    )
    .optional(),
});
const envelopeSchema = z.object({
  status: z.string(),
  output: z.array(messageSchema).default([]),
});
export function parseCompletedProposal(
  raw: unknown,
  streamedText = "",
  streamedRefusal = false,
): GeneratedPlan {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success)
    throw new PlanGenerationError(
      502,
      "Der Planentwurf war unvollständig. Die empfangene Antwort bleibt unten einsehbar.",
      modelReply(streamedText, "incomplete"),
    );
  const content = envelope.data.output.flatMap((item) =>
    item.type === "message" ? item.content || [] : [],
  );
  const refused =
    streamedRefusal || content.some((item) => item.type === "refusal");
  const text = content
    .filter((item) => item.type === "output_text" || item.type === "refusal")
    .map((item) =>
      item.type === "refusal" ? item.refusal || "" : item.text || "",
    )
    .join("\n");
  const reply = modelReply(
    text || streamedText,
    refused
      ? "refused"
      : envelope.data.status === "completed"
        ? "completed"
        : "incomplete",
  );
  if (refused)
    throw new PlanGenerationError(
      422,
      "Für diese Anfrage konnte kein Trainingsplan vorgeschlagen werden. Die Originalantwort steht unten.",
      reply,
    );
  if (reply.status !== "completed")
    throw new PlanGenerationError(
      502,
      "Der Planentwurf war unvollständig. Die empfangene Antwort bleibt unten einsehbar.",
      reply,
    );
  if (reply.truncated)
    throw new PlanGenerationError(
      502,
      "Die ChatGPT-Antwort ist zu groß. Unten siehst du einen gekennzeichneten Ausschnitt; es wurde nichts übernommen.",
      reply,
    );
  try {
    return { proposal: parsePlanResponse(reply.text), reply };
  } catch (error) {
    throw new PlanGenerationError(
      502,
      error instanceof PlanResponseError
        ? error.message
        : "Der KI-Entwurf konnte nicht gelesen werden. Die Originalantwort steht unten.",
      reply,
    );
  }
}
export async function readProposalStream(
  response: Response,
): Promise<GeneratedPlan> {
  const reader = response.body?.getReader();
  if (!reader)
    throw new PlanGenerationError(
      502,
      "Die ChatGPT-Antwort ist leer.",
      modelReply("", "failed"),
    );
  const decoder = new TextDecoder();
  // Retain public answer parts, never reasoning/tool data. Completed events
  // sometimes carry no output; the final text also arrives in the stream.
  const parts = new Map<
    string,
    { output: number; content: number; text: string; done: boolean }
  >();
  let refused = false;
  const answerText = () =>
    [...parts.values()]
      .sort((a, b) => a.output - b.output || a.content - b.content)
      .map((part) => part.text)
      .join("\n");
  const put = (
    output: number,
    content: number,
    text: string,
    done: boolean,
  ) => {
    const key = `${output}:${content}`;
    const previous = parts.get(key);
    if (!done && previous?.done) return;
    parts.set(key, {
      output,
      content,
      text: done ? text : (previous?.text || "") + text,
      done,
    });
  };
  const index = (value: unknown) =>
    typeof value === "number" && Number.isInteger(value) && value >= 0
      ? value
      : 0;
  const eventBlock = (block: string): GeneratedPlan | null => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return null;
    let event: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      event = parsed as Record<string, unknown>;
    } catch {
      throw new HttpError(
        502,
        "ChatGPT hat einen ungültigen Datenstrom geliefert. Die bisherige Antwort steht unten.",
      );
    }
    if (
      event.type === "response.output_text.delta" ||
      event.type === "response.refusal.delta"
    ) {
      if (event.type === "response.refusal.delta") refused = true;
      if (typeof event.delta === "string")
        put(
          index(event.output_index),
          index(event.content_index),
          event.delta,
          false,
        );
    }
    if (
      event.type === "response.output_text.done" ||
      event.type === "response.refusal.done"
    ) {
      if (event.type === "response.refusal.done") refused = true;
      const text =
        event.type === "response.refusal.done" ? event.refusal : event.text;
      if (typeof text === "string")
        put(index(event.output_index), index(event.content_index), text, true);
    }
    if (event.type === "response.output_item.done") {
      const item = messageSchema.safeParse(event.item);
      if (item.success && item.data.type === "message") {
        item.data.content?.forEach((part, contentIndex) => {
          if (part.type === "refusal") refused = true;
          const text =
            part.type === "output_text"
              ? part.text
              : part.type === "refusal"
                ? part.refusal
                : undefined;
          if (text !== undefined)
            put(index(event.output_index), contentIndex, text, true);
        });
      }
    }
    if (event.type === "response.failed" || event.type === "error") {
      const error = chatGptError(502, event);
      throw new PlanGenerationError(
        error.status,
        error.message,
        modelReply(answerText(), "failed"),
      );
    }
    if (event.type === "response.incomplete") {
      const envelope = envelopeSchema.safeParse(event.response);
      if (envelope.success)
        parseCompletedProposal(
          { ...envelope.data, status: "incomplete" },
          answerText(),
          refused,
        );
      throw new PlanGenerationError(
        502,
        "Der Planentwurf war unvollständig. Die empfangene Antwort bleibt unten einsehbar.",
        modelReply(answerText(), "incomplete"),
      );
    }
    if (event.type === "response.completed")
      return parseCompletedProposal(event.response, answerText(), refused);
    return null;
  };
  let buffer = "",
    size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        buffer += decoder.decode();
        // Tolerate a final event without its trailing blank line, but still
        // require response.completed before any plan is accepted.
        const result = eventBlock(buffer);
        if (result) return result;
        break;
      }
      size += chunk.value.byteLength;
      if (size > 1024 * 1024)
        throw new HttpError(
          502,
          "Die ChatGPT-Antwort ist zu groß. Es wurde nichts übernommen.",
        );
      buffer += decoder.decode(chunk.value, { stream: true });
      let match: RegExpMatchArray | null;
      while ((match = buffer.match(/\r?\n\r?\n/))) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index! + match[0].length);
        const result = eventBlock(block);
        if (result) return result;
      }
    }
    throw new PlanGenerationError(
      502,
      "Die ChatGPT-Verbindung wurde vor Abschluss unterbrochen. Die bisherige Antwort bleibt unten einsehbar.",
      modelReply(answerText(), "incomplete"),
    );
  } catch (error) {
    if (error instanceof PlanGenerationError) throw error;
    throw new PlanGenerationError(
      error instanceof HttpError ? error.status : 502,
      error instanceof HttpError
        ? error.message
        : "Die ChatGPT-Verbindung wurde unterbrochen. Die bisherige Antwort bleibt unten einsehbar.",
      modelReply(answerText(), "failed"),
    );
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
export async function generateWithChatGpt(
  input: AssistantInput,
  exerciseLibrary: { name: string; muscle: string }[],
  account: ChatGptAccount,
  transport: typeof fetch = fetch,
): Promise<GeneratedPlan> {
  if (
    !account.accessToken ||
    !account.scopes.includes("chatgpt.tokens.use.direct")
  )
    throw new HttpError(409, "Bitte zuerst mit ChatGPT verbinden.");
  if (!account.model)
    throw new HttpError(400, "Bitte ein verfügbares ChatGPT-Modell auswählen.");
  try {
    const response = await transport("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({
        model: account.model,
        store: false,
        stream: true,
        instructions: planInstructions,
        input: [{ role: "user", content: planRequest(input, exerciseLibrary) }],
        text: {
          format: {
            type: "json_schema",
            name: "training_plan",
            strict: true,
            schema: planJsonSchema(),
          },
        },
      }),
      signal: AbortSignal.timeout(90000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok)
      throw chatGptError(
        response.status,
        await response.json().catch(() => null),
      );
    return await readProposalStream(response);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      502,
      "ChatGPT ist nicht erreichbar oder die Antwort dauert zu lange. Deine Angaben bleiben erhalten. Bitte erneut versuchen.",
    );
  }
}
export async function generateProposal(
  input: AssistantInput,
  exerciseLibrary: { name: string; muscle: string }[],
) {
  return generateWithChatGpt(
    input,
    exerciseLibrary,
    await activeChatGptAccount(),
  );
}
