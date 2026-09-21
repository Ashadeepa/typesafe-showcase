import "server-only";

// gemini-2.5-flash-lite was retired ("no longer available to new users" per the API's own 404
// when we tried it) — confirmed live against the real API, not assumed from training data.
const MODEL = "gemini-3.5-flash-lite";
// Published per-1M-token rates for gemini-3.5-flash-lite (ai.google.dev/gemini-api/docs/pricing).
const PRICE_PER_M_INPUT = 0.3;
const PRICE_PER_M_OUTPUT = 2.5;

export interface GeminiCall<T> {
  value: T;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Shared low-level Gemini call used by every demo's comparison feature: same model, same
 * pricing, same JSON-schema request shape. Each demo supplies its own prompt and schema so the
 * question mirrors the one it already asks Jev.
 */
export async function askGemini<T>(apiKey: string, prompt: string, schema: Record<string, unknown>): Promise<GeminiCall<T>> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("Enter a Gemini API key to run the comparison.");

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
          responseSchema: schema,
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
  const value = JSON.parse(text) as T;

  const usage = data.usageMetadata ?? {};
  const inputTokens: number = usage.promptTokenCount ?? 0;
  const outputTokens: number = usage.candidatesTokenCount ?? 0;
  const costUsd = (inputTokens / 1_000_000) * PRICE_PER_M_INPUT + (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT;

  return { value, latencyMs, inputTokens, outputTokens, costUsd };
}
