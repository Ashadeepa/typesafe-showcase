# typesafe-showcase

A Next.js UI for showing & telling [TypeSafe](https://docs.typesafe.ai) System One (Jev)
use cases, deployable to Vercel.

**Bring your own key.** This app has no shared TypeSafe key on the server — every visitor pastes
their own `TYPESAFE_API_KEY` into the bar at the top of the page (stored only in their browser's
`localStorage`). Each Server Action takes that key as a parameter and constructs its own
`TypeSafeClient` per request (`lib/typesafe-client.ts`); there's nothing in this server's
environment for a visitor to spend. Calls still run server-side — the key just isn't baked into
the deployment.

## Use cases

- **`/parallel`** — the same 16 support tickets judged "is this about billing?" (`Noul`),
  sequentially vs. concurrently, with a live timing comparison. Both runs happen inside a single
  Server Action call each (a plain `for` loop vs. `Promise.all`), not via the client dispatching
  many Server Actions — the client-to-server RPC is dispatched one at a time by React, so the
  fan-out has to happen on the server.
- **`/citation`** — a hallucination detector: 8 claims checked against the policy documents they
  cite, using a 3-way `Choice` (`supports` / `contradicts` / `says_nothing`) instead of a plain
  yes/no.
- **`/tone`** — the passive-aggressiveness meter: 10 notes and messages scored on an escalation
  rubric (`Score`, 4 levels: good / warning / serious / critical) from a plain, sincere statement
  to full passive-aggressive weaponry, sorted worst-to-best with a "most passive-aggressive" crown.
- **`/reflex`** — Reaction Match: guess "billing" or "not billing" on a ticket before Jev's own
  `Noul` answer comes back. You're racing its real, measured response time (avg ~470ms in testing),
  not a countdown — the opponent is Jev's actual latency, not a clock.

Ported from the Python demos in [typesafe-jev-model-use-cases](https://github.com/Ashadeepa/typesafe-jev-model-use-cases).

## Local development

```bash
npm install
npm run dev
```

Open the app and paste a `TYPESAFE_API_KEY` into the bar at the top — no `.env` setup needed.

## Deploying to Vercel

```bash
vercel deploy
```

No environment variables to configure — each visitor supplies their own key at runtime.
