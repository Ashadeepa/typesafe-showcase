"use server";

import "server-only";
import { noul } from "@typesafe-ai/sdk";
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
