// Client-safe constants shared between the server-only comparison logic (lib/compare-model.ts)
// and every demo's client component. Keeping these out of compare-model.ts matters because that
// file also has `import "server-only"` and pulls in the Anthropic SDK — importing anything from
// it, even a plain constant, would drag both into the client bundle.

export type CompareProvider = "gemini" | "anthropic";

export const PROVIDER_LABEL: Record<CompareProvider, string> = {
  gemini: "Gemini 3.5 Flash-Lite",
  anthropic: "Claude Haiku 4.5",
};
