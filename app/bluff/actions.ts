"use server";

import "server-only";
import { noul } from "@typesafe-ai/sdk";
import { requireClient } from "@/lib/typesafe-client";

const QUESTION_ID = "bluffing";

function bluffQuestion() {
  return noul(
    "In the card game Bluff (also known as Cheat), a player just played `cards_played` " +
      "card(s) face-down, claiming every one of them is rank `claimed_rank`. The observer " +
      "judging this claim already holds `observer_matching` card(s) of that same rank in " +
      "their own hand, and a standard 52-card deck holds exactly 4 cards of any given rank. " +
      "Given that, how likely is it that the player is bluffing — i.e. at least one of the " +
      "face-down cards is NOT actually `claimed_rank`?",
    {
      true:
        "The claim looks like a bluff: implausible given how many matching cards are " +
        "already accounted for, or an unusually large play for that rank.",
      false: "The claim looks true: a believable number of cards given what's known.",
    },
  );
}

export interface BluffVerdict {
  bluffProbability: number;
}

/**
 * Asks Jev to judge a single claim from an opponent's-eye view. The mathematically certain
 * case (more copies of the rank are already accounted for than exist in the deck) is caught
 * in the client before this is ever called — this only runs for genuinely ambiguous claims.
 */
export async function judgeBluff(
  apiKey: string,
  claimedRank: string,
  cardsPlayed: number,
  observerMatching: number,
): Promise<BluffVerdict> {
  const client = requireClient(apiKey);
  const response = await client.systemOne({
    state: {
      claimed_rank: claimedRank,
      cards_played: cardsPlayed,
      observer_matching: observerMatching,
    },
    questions: { [QUESTION_ID]: bluffQuestion() },
  });
  return { bluffProbability: response.answers[QUESTION_ID].noul };
}
