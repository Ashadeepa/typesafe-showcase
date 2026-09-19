import "server-only";
import { TypeSafeClient } from "@typesafe-ai/sdk";

/**
 * Every demo runs on the caller's own TypeSafe key, supplied per-request from the browser
 * (see components/ApiKeyBar.tsx) — never a key baked into this server's environment. That's
 * the point: a public demo backed by one shared server key would let any visitor spend it.
 */
export function requireClient(apiKey: string): TypeSafeClient {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Enter your TypeSafe API key above to run this demo.");
  }
  return new TypeSafeClient({ apiKey: trimmed });
}
