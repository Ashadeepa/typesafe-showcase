<h1 align="center">typesafe-showcase</h1>
<p align="center"><a href="https://typesafe-showcase.vercel.app"><strong>typesafe-showcase.vercel.app</strong></a></p>

<p align="center"><em>Six live demos of <a href="https://docs.typesafe.ai">TypeSafe's System One model (Jev)</a> — each pairing a real interaction with a real judgment, and each one checkable against Gemini or Claude in the open.</em></p>

## Bring your own key

There's no shared TypeSafe key on the server — every visitor pastes their own `TYPESAFE_API_KEY`
into the bar at the top of the page (stored only in their browser's `localStorage`). Each Server
Action takes that key as a parameter and builds its own `TypeSafeClient` per request
(`lib/typesafe-client.ts`) — nothing in this deployment's environment for a visitor to spend,
though the calls still run server-side.

The same bar has an optional comparison-model picker (`lib/compare-key-context.tsx`) — **Gemini
3.5 Flash-Lite or Claude Haiku 4.5**, whichever key the visitor has — stored the same client-side
way. Every demo reads it via `useCompareModel()` to run its own judgment against that model side
by side with Jev's: same question, real latency, real cost from each provider's published
per-token pricing, never consulted for what the demo actually does. The shared plumbing lives in
`lib/compare-model.ts` (`askModel`, dispatching to Gemini's REST API or Anthropic's official SDK)
and `components/CompareStrip.tsx` (the aggregate summary the batch demos share).
`lib/compare-model-shared.ts` holds the provider type and display labels so client components
never import the server-only file.

## Use cases

| Route | Primitive | What it does |
|---|---|---|
| [`/parallel`](https://typesafe-showcase.vercel.app/parallel) | `Noul` | 16 tickets judged "is this billing?", sequential vs. concurrent inside one Server Action — timing, cost, and agreement vs. Gemini/Claude. |
| [`/citation`](https://typesafe-showcase.vercel.app/citation) | `Choice` (3-way) | 8 claims checked against the policy they cite — `supports` / `contradicts` / `says_nothing`, not a plain yes/no. |
| [`/tone`](https://typesafe-showcase.vercel.app/tone) | `Score` (4 levels) | 10 messages ranked on an escalation rubric, worst-to-best. The one demo where Gemini and Jev genuinely disagree (~60% agreement) — scoring intensity is harder to replicate than a category. |
| [`/reflex`](https://typesafe-showcase.vercel.app/reflex) | `Noul` | Guess "billing or not" before Jev's own answer lands — you're racing its real measured latency (~470ms avg), not a countdown. |
| [`/jenga`](https://typesafe-showcase.vercel.app/jenga) | `Noul` | Pull words from a sentence one at a time; Jev's "still means the same thing?" probability *is* the tower's structural integrity. |
| [`/bluff`](https://typesafe-showcase.vercel.app/bluff) | `Choice` + `Noul` | The card game Bluff (Cheat) vs. three AI opponents — Jev decides whether to bluff and whether to call one. Certain-bluff math is caught locally, no call needed. |

Every route also runs the same judgment past whichever comparison model the visitor picked, purely
for the side-by-side — never consulted for what the demo actually does.

## Stack

Next.js App Router · Server Actions · TypeSafe SDK · Zod · Gemini API · Anthropic SDK · CSS Modules

## Local development

```bash
npm install
npm run dev
```

Open the app and paste a `TYPESAFE_API_KEY` into the bar at the top — no `.env` setup needed. Pick
Gemini or Claude in the "Compare with" row and paste that provider's key too if you want to try any
demo's side-by-side comparison.

## Deploying to Vercel

```bash
vercel deploy
```

No environment variables to configure — each visitor supplies their own key at runtime.
