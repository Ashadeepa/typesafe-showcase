"use server";

import "server-only";
import { choice, noul } from "@typesafe-ai/sdk";
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
  inputTokens: number;
  outputTokens: number;
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
  return {
    bluffProbability: response.answers[QUESTION_ID].noul,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

const STRATEGY_ID = "strategy";
const COUNT_ID = "count";

export interface PlayChoice {
  bluff: boolean;
  count: number;
}

/**
 * Jev's turn to move: given what's actually in hand, should this player bluff or play their
 * real matching cards, and how many should they commit to the play? When only one strategy is
 * physically possible (no matches to play truthfully, or no other cards to bluff with) that's
 * decided locally — there's nothing left to judge.
 */
export async function chooseAiPlay(
  apiKey: string,
  claimedRank: string,
  matchingCount: number,
  otherCount: number,
  handSize: number,
): Promise<PlayChoice> {
  const strategyCriteria: Record<string, string> = {};
  if (matchingCount > 0) {
    strategyCriteria.truthful = `Play ${matchingCount} real ${claimedRank}(s) from hand — safe if challenged, but reveals real cards early.`;
  }
  if (otherCount > 0) {
    strategyCriteria.bluff = `Play card(s) that are NOT actually ${claimedRank} — risks getting caught, but keeps any real ${claimedRank}s hidden for later.`;
  }
  if (Object.keys(strategyCriteria).length < 2) {
    const bluff = matchingCount === 0;
    const pool = bluff ? otherCount : matchingCount;
    return { bluff, count: Math.min(4, Math.max(1, pool)) };
  }

  const client = requireClient(apiKey);
  const maxCount = Math.min(4, Math.max(matchingCount, otherCount));
  const countCriteria: Record<string, string> = {};
  for (let n = 1; n <= maxCount; n++) {
    countCriteria[`n${n}`] = `Play ${n} card${n === 1 ? "" : "s"} this turn.`;
  }

  const response = await client.systemOne({
    state: {
      claimed_rank: claimedRank,
      matching_in_hand: matchingCount,
      other_in_hand: otherCount,
      hand_size: handSize,
    },
    questions: {
      [STRATEGY_ID]: choice(
        "It's this player's turn in the bluffing card game Bluff (Cheat). They must play 1-4 " +
          "cards face-down and claim they're all `claimed_rank`. Given `matching_in_hand` real " +
          "matches and `other_in_hand` other cards available in a `hand_size`-card hand, which " +
          "is the stronger move right now?",
        strategyCriteria,
      ),
      [COUNT_ID]: choice(
        "Independent of whether they bluff or play truthfully, how many cards should they " +
          "commit to this single play? Playing more empties the hand faster but raises the " +
          "stakes — a bigger pile to lose — if the claim gets challenged and caught.",
        countCriteria,
      ),
    },
  });

  const bluff = response.answers[STRATEGY_ID].choice === "bluff";
  const pool = bluff ? otherCount : matchingCount;
  const rawCount = Number(response.answers[COUNT_ID].choice.replace(/^n/, ""));
  const count = Number.isInteger(rawCount) ? Math.min(Math.max(rawCount, 1), pool) : Math.min(pool, 1);
  return { bluff, count };
}
