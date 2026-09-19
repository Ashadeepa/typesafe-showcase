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

async function checkAgainstSource(
  client: TypeSafeClient,
  claim: string,
  sourceText: string,
): Promise<Omit<ClaimResult, "id" | "claim" | "source">> {
  const response = await client.systemOne({
    state: { source: sourceText, claim },
    questions: { [QUESTION_ID]: relationQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  return {
    verdict: answer.choice as Verdict,
    confidence: answer.confidence,
    probabilities: answer.probabilities as Record<Verdict, number>,
  };
}

async function checkOne(client: TypeSafeClient, item: (typeof CLAIMS)[number]): Promise<ClaimResult> {
  const judged = await checkAgainstSource(client, item.claim, SOURCES[item.source]);
  return { id: item.id, claim: item.claim, source: item.source, ...judged };
}

export async function runCitationCheck(): Promise<ClaimResult[]> {
  const client = new TypeSafeClient();
  return Promise.all(CLAIMS.map((item) => checkOne(client, item)));
}

const MAX_INPUT_LENGTH = 2000;

export async function checkCustomClaim(claim: string, sourceText: string): Promise<ClaimResult> {
  const trimmedClaim = claim.trim().slice(0, MAX_INPUT_LENGTH);
  const trimmedSource = sourceText.trim().slice(0, MAX_INPUT_LENGTH);
  if (!trimmedClaim) throw new Error("Enter a claim to check.");
  if (!trimmedSource) throw new Error("Enter the source text to check it against.");

  const client = new TypeSafeClient();
  const judged = await checkAgainstSource(client, trimmedClaim, trimmedSource);
  return { id: -1, claim: trimmedClaim, source: "your source", ...judged };
}
