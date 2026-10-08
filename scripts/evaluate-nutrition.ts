/** Explicit opt-in live evaluation. Uses the existing subscription and shared
 * app budget; no API key, user diary, retry, model substitution or paid fallback. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { getDatabase } from "../src/db";
import { activeChatGptAccount } from "../src/lib/chatgpt-oauth";
import { consumeAiBudget } from "../src/lib/ai-budget";
import {
  requestStructuredWithChatGpt,
  PlanGenerationError,
} from "../src/lib/openai";
import { HttpError } from "../src/lib/http";
import { mealRequest } from "../src/lib/nutrition-prompt";
import { adviceRequest } from "../src/lib/advice-prompt";
import {
  mealEvaluationCases,
  syntheticAdviceThread,
  adviceEvaluationQuestion,
  followupEvaluationQuestion,
} from "../tests/fixtures/nutrition-evaluation";

async function main() {
  const [caseName, output, previous] = process.argv.slice(2);
  if (
    !caseName ||
    !output ||
    (!Object.hasOwn(mealEvaluationCases, caseName) &&
      !["advice-incomplete", "advice-followup"].includes(caseName))
  )
    throw new Error(
      "Usage: npm run eval:nutrition -- <case> <output.json> [prior-advice-result.json]",
    );
  if (existsSync(output))
    throw new Error(
      "Output already exists; choose a new path before making another model request.",
    );
  const thread = syntheticAdviceThread();
  let question = adviceEvaluationQuestion;
  if (caseName === "advice-followup") {
    if (!previous)
      throw new Error(
        "The follow-up requires a saved synthetic advice result.",
      );
    const prior = JSON.parse(readFileSync(previous, "utf8"));
    if (
      prior.case !== "advice-incomplete" ||
      typeof prior.proposal?.answer !== "string"
    )
      throw new Error("A valid synthetic advice result is required.");
    thread.exchanges = [
      {
        id: "prior",
        question: adviceEvaluationQuestion,
        answer: prior.proposal.answer,
        position: 0,
        createdAt: 0,
      },
    ];
    thread.version = 1;
    question = followupEvaluationQuestion;
  }
  const meal =
    mealEvaluationCases[caseName as keyof typeof mealEvaluationCases];
  const spec = meal
    ? mealRequest(meal.description)
    : adviceRequest(thread, question);
  const account = await activeChatGptAccount();
  consumeAiBudget(getDatabase().sqlite, "plan");
  const metadata = {
    case: caseName,
    model: account.model,
    timestamp: new Date().toISOString(),
    synthetic: true,
    promptHash: createHash("sha256").update(spec.instructions).digest("hex"),
    instructions: spec.instructions,
    input: JSON.parse(spec.input),
  };
  mkdirSync(dirname(output), { recursive: true });
  try {
    const result = await requestStructuredWithChatGpt<unknown>(spec, account);
    writeFileSync(
      output,
      JSON.stringify({ ...metadata, ...result }, null, 2) + "\n",
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        case: caseName,
        model: account.model,
        output,
        proposal: result.proposal,
      }),
    );
  } catch (error) {
    // Provider/credential details are never logged or exported.
    if (error instanceof HttpError) {
      writeFileSync(
        output,
        JSON.stringify(
          {
            ...metadata,
            error: error.message,
            status: error.status,
            ...(error instanceof PlanGenerationError
              ? { reply: error.reply }
              : {}),
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      console.error(error.message);
      process.exitCode = 1;
    } else throw new Error("Evaluation failed; no provider details logged.");
  }
}
main().catch((e) => {
  console.error(
    e instanceof HttpError
      ? e.message
      : e instanceof Error
        ? e.message
        : "Evaluation failed.",
  );
  process.exitCode = 1;
});
