import { z } from "zod";
import {
  authorize,
  errorResponse,
  json,
  readJson,
  HttpError,
} from "@/lib/http";
import {
  startChatGptLogin,
  acknowledgeChatGptWelcome,
  cancelChatGptLogin,
  activeChatGptAccount,
  disconnectChatGpt,
  selectChatGptAccount,
} from "@/lib/chatgpt-oauth";
import { chatGptModels } from "@/lib/openai";
import { requireLocalChatGpt } from "@/lib/chatgpt-store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json({ models: await chatGptModels(await activeChatGptAccount()) });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await authorize(request);
    requireLocalChatGpt();
    const data = await readJson(
      request,
      z
        .object({
          action: z.enum([
            "connect",
            "cancel",
            "disconnect",
            "select",
            "model",
            "welcome",
          ]),
          accountId: z.string().max(100).optional(),
          model: z.string().max(200).optional(),
        })
        .strict(),
    );
    if (data.action === "connect")
      return json(await startChatGptLogin(data.accountId));
    if (data.action === "cancel") {
      cancelChatGptLogin();
      return json({ ok: true });
    }
    if (data.action === "welcome") {
      await acknowledgeChatGptWelcome();
      return json({ ok: true });
    }
    if (!data.accountId)
      throw new HttpError(400, "Bitte ein ChatGPT-Konto auswählen.");
    if (data.action === "disconnect")
      return json(await disconnectChatGpt(data.accountId));
    if (data.action === "model") {
      const account = await activeChatGptAccount();
      if (
        account.id !== data.accountId ||
        !(await chatGptModels(account)).some((m) => m.id === data.model)
      )
        throw new HttpError(
          400,
          "Dieses Modell ist für das aktive Konto nicht verfügbar.",
        );
    }
    await selectChatGptAccount(
      data.accountId,
      data.action === "model" ? data.model : undefined,
    );
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
