"use server";

import "server-only";
import { z } from "zod";
import { askModel, type CompareProvider } from "@/lib/compare-model";

const BluffSchema = z.object({ bluff_probability: z.number() });
const BLUFF_GEMINI_SCHEMA = {
  type: "object",
  properties: { bluff_probability: { type: "number" } },
  required: ["bluff_probability"],
};

function bluffPrompt(claimedRank: string, cardsPlayed: number, observerMatching: number) {
  return (
    "In the card game Bluff (also known as Cheat), a player just played " +
    `${cardsPlayed} card(s) face-down, claiming every one of them is rank "${claimedRank}". ` +
    `The observer judging this claim already holds ${observerMatching} card(s) of that same ` +
    "rank in their own hand, and a standard 52-card deck holds exactly 4 cards of any given " +
    "rank. Given that, how likely is it that the player is bluffing — i.e. at least one of the " +
    'face-down cards is NOT actually that rank? Respond with only a JSON object: {"bluff_probability": <number between 0 and 1>}.'
  );
}

export interface CompareVerdict {
  bluffProbability: number;
  latencyMs: number;
  costUsd: number;
}

/**
 * Same bluff-judgment question posed to Jev, asked of whichever comparison model the visitor
 * picked — purely for a side-by-side latency/cost comparison on the Bluff page. Never used to
 * drive gameplay.
 */
export async function judgeBluffCompare(
  provider: CompareProvider,
  apiKey: string,
  claimedRank: string,
  cardsPlayed: number,
  observerMatching: number,
): Promise<CompareVerdict> {
  const result = await askModel(provider, apiKey, bluffPrompt(claimedRank, cardsPlayed, observerMatching), {
    gemini: BLUFF_GEMINI_SCHEMA,
    zod: BluffSchema,
  });
  const n = result.value.bluff_probability;
  const bluffProbability = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
  return { bluffProbability, latencyMs: result.latencyMs, costUsd: result.costUsd };
}
