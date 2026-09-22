"use server";

import "server-only";
import { choice, noul } from "@typesafe-ai/sdk";
import { z } from "zod";
import { requireClient } from "@/lib/typesafe-client";
import { askModel, type CompareProvider } from "@/lib/compare-model";
import { COLLAPSE_THRESHOLD } from "@/lib/jenga-data";

const QUESTION_ID = "holds";
const MAX_LENGTH = 400;

function holdsQuestion() {
  return noul(
    "Does `shortened_sentence` still convey the same core meaning as `original_sentence`?",
    {
      true:
        "The core meaning survives: the same main actor, action, and target are still recoverable. " +
        "Losing descriptive detail — adjectives, adverbs, articles, minor qualifiers — is fine.",
      false:
        "The core meaning is broken: a key actor, action, or object is missing, the meaning has " +
        "changed to something else, or the result is too fragmented to parse as a statement.",
    },
  );
}

export interface PullVerdict {
  holds: boolean;
  stability: number;
  inputTokens: number;
  outputTokens: number;
}

export async function judgeRemoval(
  apiKey: string,
  original: string,
  shortened: string,
): Promise<PullVerdict> {
  const client = requireClient(apiKey);
  const from = original.trim().slice(0, MAX_LENGTH);
  const to = shortened.trim().slice(0, MAX_LENGTH);
  if (!from || !to) throw new Error("Nothing left to judge.");

  const response = await client.systemOne({
    state: { original_sentence: from, shortened_sentence: to },
    questions: { [QUESTION_ID]: holdsQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return {
    holds: answer.noul > COLLAPSE_THRESHOLD,
    stability: answer.noul,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

const PICK_ID = "pick";

/**
 * Jev's turn. It has to pull a word like any other player, so it picks the one it judges safest —
 * which works fine until the safe words run out and it's forced into a load-bearing one.
 */
export async function chooseWord(
  apiKey: string,
  original: string,
  current: string,
  words: string[],
): Promise<number> {
  const client = requireClient(apiKey);
  if (words.length === 0) throw new Error("No words left to choose from.");

  const criteria: Record<string, string> = {};
  words.forEach((w, i) => {
    criteria[`w${i}`] = `Remove the word “${w}” (position ${i + 1}).`;
  });

  const response = await client.systemOne({
    state: { sentence: current, original_meaning: original },
    questions: {
      [PICK_ID]: choice(
        "You are playing a word-removal game. After removing one word, the sentence must still " +
          "mean the same thing as `original_meaning`. Which single word is the SAFEST to remove — " +
          "the one whose removal damages the core meaning least?",
        criteria,
      ),
    },
  });

  const picked = Number(response.answers[PICK_ID].choice.replace(/^w/, ""));
  // Defensive: never let an unexpected label stall the game.
  return Number.isInteger(picked) && picked >= 0 && picked < words.length ? picked : 0;
}

export interface ComparePullVerdict {
  holds: boolean;
  stability: number;
  latencyMs: number;
  costUsd: number;
}

const HoldsSchema = z.object({ holds_probability: z.number() });
const HOLDS_GEMINI_SCHEMA = {
  type: "object",
  properties: { holds_probability: { type: "number" } },
  required: ["holds_probability"],
};

function holdsPrompt(original: string, shortened: string) {
  return (
    `Does "${shortened}" still convey the same core meaning as "${original}"? The core meaning ` +
    "survives if the same main actor, action, and target are still recoverable — losing " +
    "descriptive detail (adjectives, adverbs, articles, minor qualifiers) is fine. It's broken if " +
    "a key actor, action, or object is missing, the meaning changed to something else, or the " +
    'result is too fragmented to parse. Respond with only a JSON object: {"holds_probability": ' +
    "<number between 0 and 1>}."
  );
}

/** Same holds-meaning judgment, asked of the chosen comparison model instead of Jev — purely for comparison. */
export async function judgeRemovalCompare(
  provider: CompareProvider,
  apiKey: string,
  original: string,
  shortened: string,
): Promise<ComparePullVerdict> {
  const from = original.trim().slice(0, MAX_LENGTH);
  const to = shortened.trim().slice(0, MAX_LENGTH);
  const call = await askModel(provider, apiKey, holdsPrompt(from, to), { gemini: HOLDS_GEMINI_SCHEMA, zod: HoldsSchema });
  return {
    holds: call.value.holds_probability > COLLAPSE_THRESHOLD,
    stability: call.value.holds_probability,
    latencyMs: call.latencyMs,
    costUsd: call.costUsd,
  };
}
