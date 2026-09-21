import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import type { CompareProvider } from "./compare-model-shared";

export type { CompareProvider } from "./compare-model-shared";

// gemini-2.5-flash-lite was retired ("no longer available to new users" per the API's own 404
// when we tried it) — confirmed live against the real API, not assumed from training data.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
// Published per-1M-token rates (ai.google.dev/gemini-api/docs/pricing).
const GEMINI_PRICE = { input: 0.3, output: 2.5 };

// Confirmed against Anthropic's own current pricing table, not recalled from training data.
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const ANTHROPIC_PRICE = { input: 1.0, output: 5.0 };

export interface CompareResult<T> {
  value: T;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  provider: CompareProvider;
  model: string;
}

export interface CompareSchemas<T> {
  /** JSON Schema (lowercase `type` values) for Gemini's `responseSchema`. */
  gemini: Record<string, unknown>;
  /** The same shape as a Zod schema, for Anthropic's `output_config.format`. */
  zod: ZodType<T>;
}

async function askGemini<T>(apiKey: string, prompt: string, schema: Record<string, unknown>): Promise<CompareResult<T>> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("Enter a Gemini API key to run the comparison.");

  const start = performance.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(trimmed)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema },
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
  const value = JSON.parse(text) as T;

  const usage = data.usageMetadata ?? {};
  const inputTokens: number = usage.promptTokenCount ?? 0;
  const outputTokens: number = usage.candidatesTokenCount ?? 0;
  const costUsd = (inputTokens / 1_000_000) * GEMINI_PRICE.input + (outputTokens / 1_000_000) * GEMINI_PRICE.output;

  return { value, latencyMs, inputTokens, outputTokens, costUsd, provider: "gemini", model: GEMINI_MODEL };
}

async function askAnthropic<T>(apiKey: string, prompt: string, zodSchema: ZodType<T>): Promise<CompareResult<T>> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("Enter a Claude API key to run the comparison.");

  const client = new Anthropic({ apiKey: trimmed });
  const start = performance.now();
  const message = await client.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(zodSchema) },
  });
  const latencyMs = performance.now() - start;

  if (message.parsed_output === null) throw new Error("Claude did not return valid structured output.");

  const inputTokens = message.usage.input_tokens ?? 0;
  const outputTokens = message.usage.output_tokens;
  const costUsd = (inputTokens / 1_000_000) * ANTHROPIC_PRICE.input + (outputTokens / 1_000_000) * ANTHROPIC_PRICE.output;

  return { value: message.parsed_output, latencyMs, inputTokens, outputTokens, costUsd, provider: "anthropic", model: ANTHROPIC_MODEL };
}

/**
 * Ask whichever comparison model the visitor picked the same question posed to Jev. Each demo
 * supplies its own prompt plus both schema shapes (Gemini needs a plain JSON Schema; Anthropic's
 * official SDK needs a Zod schema) so the question mirrors the one already asked of Jev.
 */
export async function askModel<T>(
  provider: CompareProvider,
  apiKey: string,
  prompt: string,
  schemas: CompareSchemas<T>,
): Promise<CompareResult<T>> {
  return provider === "anthropic" ? askAnthropic(apiKey, prompt, schemas.zod) : askGemini(apiKey, prompt, schemas.gemini);
}
