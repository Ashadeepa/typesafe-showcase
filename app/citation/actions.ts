"use server";

import "server-only";
import { choice, type TypeSafeClient } from "@typesafe-ai/sdk";
import { z } from "zod";
import { CLAIMS, SOURCES } from "@/lib/data";
import { requireClient } from "@/lib/typesafe-client";
import { askModel, type CompareProvider } from "@/lib/compare-model";

export type Verdict = "supports" | "contradicts" | "says_nothing";

export interface ClaimResult {
  id: number;
  claim: string;
  source: string;
  verdict: Verdict;
  confidence: number;
  probabilities: Record<Verdict, number>;
  inputTokens: number;
  outputTokens: number;
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
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function checkOne(client: TypeSafeClient, item: (typeof CLAIMS)[number]): Promise<ClaimResult> {
  const judged = await checkAgainstSource(client, item.claim, SOURCES[item.source]);
  return { id: item.id, claim: item.claim, source: item.source, ...judged };
}

export async function runCitationCheck(apiKey: string): Promise<ClaimResult[]> {
  const client = requireClient(apiKey);
  return Promise.all(CLAIMS.map((item) => checkOne(client, item)));
}

const MAX_INPUT_LENGTH = 2000;

export async function checkCustomClaim(
  apiKey: string,
  claim: string,
  sourceText: string,
): Promise<ClaimResult> {
  const client = requireClient(apiKey);
  const trimmedClaim = claim.trim().slice(0, MAX_INPUT_LENGTH);
  const trimmedSource = sourceText.trim().slice(0, MAX_INPUT_LENGTH);
  if (!trimmedClaim) throw new Error("Enter a claim to check.");
  if (!trimmedSource) throw new Error("Enter the source text to check it against.");

  const judged = await checkAgainstSource(client, trimmedClaim, trimmedSource);
  return { id: -1, claim: trimmedClaim, source: "your source", ...judged };
}

export interface CompareClaimResult {
  id: number;
  verdict: Verdict;
}
export interface CompareCitationResult {
  results: CompareClaimResult[];
  elapsedMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const VerdictSchema = z.object({ verdict: z.enum(["supports", "contradicts", "says_nothing"]) });
const VERDICT_GEMINI_SCHEMA = {
  type: "object",
  properties: { verdict: { type: "string", enum: ["supports", "contradicts", "says_nothing"] } },
  required: ["verdict"],
};

function relationPrompt(sourceText: string, claim: string) {
  return (
    "How does the source relate to the claim? Judge only against what the source actually says, " +
    `not general knowledge. Source: "${sourceText}" Claim: "${claim}" ` +
    'Respond with only a JSON object: {"verdict": "supports" | "contradicts" | "says_nothing"}. ' +
    '"supports" means the source states the claim or directly implies it is true. "contradicts" ' +
    "means the source states the opposite, or a detail that makes the claim false. " +
    '"says_nothing" means the source never addresses what the claim asserts, either way.'
  );
}

/** Same 8 claims, checked against the chosen comparison model instead of Jev. */
export async function runCompareCitationCheck(provider: CompareProvider, apiKey: string): Promise<CompareCitationResult> {
  const start = performance.now();
  const calls = await Promise.all(
    CLAIMS.map((item) =>
      askModel(provider, apiKey, relationPrompt(SOURCES[item.source], item.claim), {
        gemini: VERDICT_GEMINI_SCHEMA,
        zod: VerdictSchema,
      }),
    ),
  );
  return {
    results: CLAIMS.map((item, i) => ({ id: item.id, verdict: calls[i].value.verdict })),
    elapsedMs: performance.now() - start,
    inputTokens: calls.reduce((s, c) => s + c.inputTokens, 0),
    outputTokens: calls.reduce((s, c) => s + c.outputTokens, 0),
    costUsd: calls.reduce((s, c) => s + c.costUsd, 0),
  };
}
