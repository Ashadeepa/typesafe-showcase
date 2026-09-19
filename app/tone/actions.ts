"use server";

import "server-only";
import { score, type TypeSafeClient } from "@typesafe-ai/sdk";
import { NOTES } from "@/lib/data";
import { requireClient } from "@/lib/typesafe-client";

const QUESTION_ID = "escalation";

// Reuses the dataviz status palette on purpose: this rubric IS a state escalation
// (good -> warning -> serious -> critical), not an arbitrary 0-4 scale.
const LEVELS = [
  "Good: warm and direct, no subtext — says what it means and nothing else.",
  "Warning: mostly polite, but a word choice or a slightly clipped tone hints something's off.",
  "Serious: a clear passive-aggressive tell — a pointed 'per my last email,' a lonely exclamation "
    + "point, or a 'no worries!' that obviously means the opposite.",
  "Critical: full passive-aggressive weaponry — ALL CAPS, sarcasm, a backhanded compliment, or a "
    + "sign-off cheerful enough to kill a houseplant.",
] as const;

function escalationQuestion() {
  return score(
    "How passive-aggressive is this message, on an escalation from a plain, sincere statement to "
    + "a thinly-veiled attack?",
    LEVELS,
  );
}

export interface NoteResult {
  id: number;
  text: string;
  context: string;
  score: number;
  confidence: number;
  levelLabel: string;
}

async function judgeOne(client: TypeSafeClient, note: (typeof NOTES)[number]): Promise<NoteResult> {
  const response = await client.systemOne({
    state: { message: note.text, where_it_was_said: note.context },
    questions: { [QUESTION_ID]: escalationQuestion() },
  });
  const answer = response.answers[QUESTION_ID];
  const roundedLevel = Math.min(LEVELS.length - 1, Math.max(0, Math.round(answer.score)));
  return {
    id: note.id,
    text: note.text,
    context: note.context,
    score: answer.score,
    confidence: answer.confidence,
    levelLabel: LEVELS[roundedLevel].split(":")[0],
  };
}

export async function runToneCheck(apiKey: string): Promise<NoteResult[]> {
  const client = requireClient(apiKey);
  const results = await Promise.all(NOTES.map((note) => judgeOne(client, note)));
  return results.sort((a, b) => b.score - a.score);
}

const MAX_INPUT_LENGTH = 500;

export async function runToneCheckCustom(
  apiKey: string,
  text: string,
  context: string,
): Promise<NoteResult> {
  const client = requireClient(apiKey);
  const trimmedText = text.trim().slice(0, MAX_INPUT_LENGTH);
  if (!trimmedText) throw new Error("Enter a message to check.");
  const trimmedContext = context.trim().slice(0, MAX_INPUT_LENGTH) || "Custom input";

  return judgeOne(client, { id: -1, text: trimmedText, context: trimmedContext });
}
