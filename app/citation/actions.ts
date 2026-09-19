"use server";

import "server-only";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { CLAIMS, SOURCES } from "@/lib/data";

export type Verdict = "supports" | "contradicts" | "says_nothing";

export interface ClaimResult {
  id: number;
  claim: string;
  source: string;
  verdict: Verdict;
  confidence: number;
  probabilities: Record<Verdict, number>;
}

const QUESTION_ID = "relation";

function relationQuestion() {
  return choice(
    "How does `source` relate to `claim`? Judge only against what `source` actually says, not general knowledge.",
    {
      supports: "The source states the claim or directly implies it is true.",
      contradicts:
        "The source states the opposite of the claim, or a detail that makes the claim false (e.g. a different number, limit, or condition).",
      says_nothing:
        "The source does not address what the claim asserts, either way — the claim introduces information the source never mentions.",
    },
  );
}

async function checkOne(client: TypeSafeClient, item: (typeof CLAIMS)[number]): Promise<ClaimResult> {
  const sourceText = SOURCES[item.source];
  const response = await client.systemOne({
    state: { source: sourceText, claim: item.claim },
    questions: { [QUESTION_ID]: relationQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return {
    id: item.id,
    claim: item.claim,
    source: item.source,
    verdict: answer.choice as Verdict,
    confidence: answer.confidence,
    probabilities: answer.probabilities as Record<Verdict, number>,
  };
}

export async function runCitationCheck(): Promise<ClaimResult[]> {
  const client = new TypeSafeClient();
  return Promise.all(CLAIMS.map((item) => checkOne(client, item)));
}
