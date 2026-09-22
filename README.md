# typesafe-showcase

A Next.js UI for showing & telling [TypeSafe](https://docs.typesafe.ai) System One (Jev)
use cases, deployable to Vercel.

**Bring your own key.** This app has no shared TypeSafe key on the server — every visitor pastes
their own `TYPESAFE_API_KEY` into the bar at the top of the page (stored only in their browser's
`localStorage`). Each Server Action takes that key as a parameter and constructs its own
`TypeSafeClient` per request (`lib/typesafe-client.ts`); there's nothing in this server's
environment for a visitor to spend. Calls still run server-side — the key just isn't baked into
the deployment.

The same bar also has an optional comparison-model picker (`lib/compare-key-context.tsx`) —
**Gemini 3.5 Flash-Lite or Claude Haiku 4.5**, whichever key the visitor actually has — stored the
same client-side way. Every demo reads it via `useCompareModel()` to run its own judgment against
that model side by side with Jev's: same question, real latency, real cost (from each provider's
published per-token pricing), never consulted for what the demo actually does. The shared plumbing
lives in `lib/compare-model.ts` (`askModel`, dispatching to Gemini's REST API or Anthropic's
official SDK depending on the picked provider — each demo supplies its own prompt plus a JSON
Schema for Gemini and a matching Zod schema for Claude's structured output) and
`components/CompareStrip.tsx` (the aggregate summary used by the batch demos). `lib/compare-model-shared.ts`
holds the provider type and display labels so client components never import the server-only file.

## Use cases

- **`/parallel`** — the same 16 support tickets judged "is this about billing?" (`Noul`),
  sequentially vs. concurrently, with a live timing comparison. Both runs happen inside a single
  Server Action call each (a plain `for` loop vs. `Promise.all`), not via the client dispatching
  many Server Actions — the client-to-server RPC is dispatched one at a time by React, so the
  fan-out has to happen on the server. A "Compare with Gemini/Claude" button runs the same batch
  through the picked model in parallel and shows timing, cost, and agreement rate against Jev.
- **`/citation`** — a hallucination detector: 8 claims checked against the policy documents they
  cite, using a 3-way `Choice` (`supports` / `contradicts` / `says_nothing`) instead of a plain
  yes/no. The comparison model runs the same 8 claims through the equivalent 3-way classification.
- **`/tone`** — the passive-aggressiveness meter: 10 notes and messages scored on an escalation
  rubric (`Score`, 4 levels: good / warning / serious / critical) from a plain, sincere statement
  to full passive-aggressive weaponry, sorted worst-to-best with a "most passive-aggressive" crown.
  The comparison here tends to show real disagreement (~60% agreement with Gemini in testing)
  rather than the near-100% seen on the classification demos — scoring subjective intensity is a
  genuinely harder judgment to replicate than a category or a probability.
- **`/reflex`** — Reaction Match: guess "billing" or "not billing" on a ticket before Jev's own
  `Noul` answer comes back. You're racing its real, measured response time (avg ~470ms in testing),
  not a countdown — the opponent is Jev's actual latency, not a clock. With a comparison key set,
  each round also fires the same judgment at that model in the background — never part of the
  race, just an extra "Gemini: Billing (Xms)" (or Claude) line once it answers.
- **`/jenga`** — Sentence Jenga: pull one word at a time out of a sentence; after each pull Jev
  judges (`Noul`) whether it still means what it started out meaning. The probability it returns
  *is* the tower's structural integrity — so you watch the meter go from solid (~0.95 while
  modifiers come out) to wobbling (~0.74 once the object goes) to collapse (~0.24 when the actor or
  verb goes). Uses the model's uncertainty as the game mechanic, not just its answer. Each pull also
  asks the comparison model the same holds-meaning question in the background, purely for
  comparison.
- **`/bluff`** — the classic Indian card game Bluff (Cheat) against three AI opponents. Each
  opponent's turn asks Jev a `Choice` (bluff or play truthfully, and how many cards) and, on every
  other player's turn, a `Noul` judging how plausible the claim is — except when the math already
  makes a claim impossible, which is caught locally with no call at all. Runs its own visual
  identity — a gold/parchment card-table look, scoped via a CSS module — rather than the shared
  dashboard style the other demos use. Every bluff-call judgment also runs the same question past
  the comparison model in parallel — fire-and-forget, never consulted for the actual call.


## Local development

```bash
npm install
npm run dev
```

Open the app and paste a `TYPESAFE_API_KEY` into the bar at the top — no `.env` setup needed.
Pick Gemini or Claude in the "Compare with" row and paste that provider's key too if you want to
try any demo's side-by-side comparison.

## Deploying to Vercel

```bash
vercel deploy
```

No environment variables to configure — each visitor supplies their own key at runtime.
