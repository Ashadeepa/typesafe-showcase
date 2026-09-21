"use server";

import "server-only";

// gemini-2.5-flash-lite was retired ("no longer available to new users" per the API's own 404) —
// confirmed live against the real API before shipping this, not assumed from training data.
const MODEL = "gemini-3.5-flash-lite";
// Published per-1M-token rates for gemini-3.5-flash-lite (ai.google.dev/gemini-api/docs/pricing).
const PRICE_PER_M_INPUT = 0.3;
const PRICE_PER_M_OUTPUT = 2.5;

export interface GeminiVerdict {
  bluffProbability: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Same bluff-judgment question posed to Jev, asked of Gemini 3.5 Flash-Lite instead, purely for
 * a side-by-side latency/cost comparison on the Bluff page. Never used to drive gameplay.
 */
export async function judgeBluffGemini(
  apiKey: string,
  claimedRank: string,
  cardsPlayed: number,
  observerMatching: number,
): Promise<GeminiVerdict> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("Enter a Gemini API key to run the comparison.");

  const prompt =
    "In the card game Bluff (also known as Cheat), a player just played " +
    `${cardsPlayed} card(s) face-down, claiming every one of them is rank "${claimedRank}". ` +
    `The observer judging this claim already holds ${observerMatching} card(s) of that same ` +
    "rank in their own hand, and a standard 52-card deck holds exactly 4 cards of any given " +
    "rank. Given that, how likely is it that the player is bluffing — i.e. at least one of the " +
    'face-down cards is NOT actually that rank? Respond with only a JSON object: {"bluff_probability": <number between 0 and 1>}.';

  const start = performance.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(trimmed)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: { bluff_probability: { type: "number" } },
            required: ["bluff_probability"],
          },
        },
      }),
    },
  );
  const latencyMs = performance.now() - start;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let bluffProbability = 0.5;
  try {
    const parsed = JSON.parse(text);
    const n = Number(parsed.bluff_probability);
    if (Number.isFinite(n)) bluffProbability = Math.max(0, Math.min(1, n));
  } catch {
    // Gemini returned something that wasn't valid JSON — keep the neutral default rather than fail the comparison.
  }

  const usage = data.usageMetadata ?? {};
  const inputTokens: number = usage.promptTokenCount ?? 0;
  const outputTokens: number = usage.candidatesTokenCount ?? 0;
  const costUsd = (inputTokens / 1_000_000) * PRICE_PER_M_INPUT + (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT;

  return { bluffProbability, latencyMs, inputTokens, outputTokens, costUsd };
}
