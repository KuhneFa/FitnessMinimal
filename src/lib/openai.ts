import { z } from "zod";
import { HttpError } from "./http";
import {
  type AssistantInput,
  type PlanProposal,
} from "./ai-contract";
import { planInstructions, planJsonSchema, planRequest } from "./plan-prompt";
import { activeChatGptAccount } from "./chatgpt-oauth";
import type { ChatGptAccount } from "./chatgpt-store";
import { parsePlanResponse, PlanResponseError } from "./plan-response";

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
export function subscriptionError() {
  return new HttpError(
    429,
    "Dein ChatGPT-Nutzungslimit ist erreicht oder die Abo-Nutzung ist nicht verfügbar. Prüfe die Nutzung in ChatGPT oder versuche es später. Es wird keine kostenpflichtige API verwendet.",
  );
}
const envelopeSchema = z.object({
  status: z.literal("completed"),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});
export function parseCompletedProposal(raw: unknown): PlanProposal {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success)
    throw new HttpError(
      502,
      "Der Planentwurf war unvollständig. Bitte erneut versuchen.",
    );
  const content = envelope.data.output.flatMap((item) =>
    item.type === "message" ? item.content || [] : [],
  );
  if (content.some((item) => item.type === "refusal"))
    throw new HttpError(
      422,
      "Für diese Anfrage konnte kein Trainingsplan vorgeschlagen werden. Bitte formuliere deine Trainingswünsche neu.",
    );
  try {
    return parsePlanResponse(
      content
        .filter((item) => item.type === "output_text")
        .map((item) => item.text || "")
        .join(""),
    );
  } catch (error) {
    throw new HttpError(
      502,
      error instanceof PlanResponseError
        ? error.message
        : "Der KI-Entwurf konnte nicht gelesen werden. Es wurde nichts übernommen.",
    );
  }
}
export async function readProposalStream(
  response: Response,
): Promise<PlanProposal> {
  const reader = response.body?.getReader();
  if (!reader) throw new HttpError(502, "Die ChatGPT-Antwort ist leer.");
  const decoder = new TextDecoder();
  let buffer = "",
    size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1024 * 1024)
        throw new HttpError(502, "Die ChatGPT-Antwort ist zu groß.");
      buffer += decoder.decode(chunk.value, { stream: true });
      // SSE separators may be split across transport chunks, including between CR and LF.
      let match: RegExpMatchArray | null;
      while ((match = buffer.match(/\r?\n\r?\n/))) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index! + match[0].length);
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        let event: { type?: string; response?: unknown };
        try {
          event = JSON.parse(data);
        } catch {
          throw new HttpError(
            502,
            "ChatGPT hat einen ungültigen Datenstrom geliefert.",
          );
        }
        if (event.type === "response.failed" || event.type === "error") {
          if (
            /subscription_sharing_usage_limit_exceeded|subscription_sharing_usage_unavailable/.test(
              data,
            )
          )
            throw subscriptionError();
          throw new HttpError(
            502,
            "Die ChatGPT-Anfrage ist fehlgeschlagen. Deine Angaben bleiben erhalten.",
          );
        }
        if (event.type === "response.incomplete")
          throw new HttpError(
            502,
            "Der Planentwurf war unvollständig. Bitte erneut versuchen.",
          );
        if (event.type === "response.completed")
          return parseCompletedProposal(event.response);
      }
    }
    throw new HttpError(
      502,
      "Die ChatGPT-Verbindung wurde vor Abschluss unterbrochen. Bitte erneut versuchen.",
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
): Promise<PlanProposal> {
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
    if (response.status === 429) throw subscriptionError();
    if (response.status === 401 || response.status === 403)
      throw new HttpError(
        409,
        "Die ChatGPT-Verbindung ist abgelaufen oder nicht freigegeben. Bitte erneut verbinden.",
      );
    if (!response.ok)
      throw new HttpError(
        502,
        "ChatGPT konnte den Vorschlag nicht erstellen. Prüfe das gewählte Modell oder nutze den ChatGPT-Import.",
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
