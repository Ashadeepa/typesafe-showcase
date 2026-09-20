"use server";

import "server-only";
import { choice, noul } from "@typesafe-ai/sdk";
import { requireClient } from "@/lib/typesafe-client";
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
  return { holds: answer.noul > COLLAPSE_THRESHOLD, stability: answer.noul };
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
