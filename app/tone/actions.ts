"use server";

import "server-only";
import { score, type TypeSafeClient } from "@typesafe-ai/sdk";
import { NOTES } from "@/lib/data";
import { requireClient } from "@/lib/typesafe-client";
import { askGemini } from "@/lib/gemini";

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

export interface GeminiNoteResult {
  id: number;
  score: number;
}
export interface GeminiToneResult {
  results: GeminiNoteResult[];
  elapsedMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const SCORE_SCHEMA = {
  type: "object",
  properties: { score: { type: "number" } },
  required: ["score"],
};

function escalationPrompt(message: string, whereSaid: string) {
  return (
    "How passive-aggressive is this message, on a scale from 0 to 3, where 0 is warm and direct " +
    "with no subtext, 1 is mostly polite but a word choice or clipped tone hints something's off, " +
    "2 is a clear passive-aggressive tell (e.g. a pointed 'per my last email' or a lonely " +
    "exclamation point), and 3 is full passive-aggressive weaponry (ALL CAPS, sarcasm, a " +
    `backhanded compliment)? Message: "${message}" (said in: ${whereSaid}) ` +
    'Respond with only a JSON object: {"score": <number between 0 and 3>}.'
  );
}

/** Same 10 notes, scored by Gemini instead of Jev — purely for a side-by-side comparison. */
export async function runGeminiToneCheck(geminiApiKey: string): Promise<GeminiToneResult> {
  const start = performance.now();
  const calls = await Promise.all(
    NOTES.map((n) => askGemini<{ score: number }>(geminiApiKey, escalationPrompt(n.text, n.context), SCORE_SCHEMA)),
  );
  return {
    results: NOTES.map((n, i) => ({ id: n.id, score: calls[i].value.score })),
    elapsedMs: performance.now() - start,
    inputTokens: calls.reduce((s, c) => s + c.inputTokens, 0),
    outputTokens: calls.reduce((s, c) => s + c.outputTokens, 0),
    costUsd: calls.reduce((s, c) => s + c.costUsd, 0),
  };
}
