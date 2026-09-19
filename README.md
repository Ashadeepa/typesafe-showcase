# typesafe-showcase

A Next.js UI for showing & telling two [TypeSafe](https://docs.typesafe.ai) System One (Jev)
use cases, deployable to Vercel. All TypeSafe calls run server-side (Server Actions) — the API
key never reaches the browser.

## Use cases

- **`/parallel`** — the same 16 support tickets judged "is this about billing?" (`Noul`),
  sequentially vs. concurrently, with a live timing comparison. Both runs happen inside a single
  Server Action call each (a plain `for` loop vs. `Promise.all`), not via the client dispatching
  many Server Actions — the client-to-server RPC is dispatched one at a time by React, so the
  fan-out has to happen on the server.
- **`/citation`** — a hallucination detector: 8 claims checked against the policy documents they
  cite, using a 3-way `Choice` (`supports` / `contradicts` / `says_nothing`) instead of a plain
  yes/no.

Ported from the Python demos in [typesafe-jev-model-use-cases](https://github.com/Ashadeepa/typesafe-jev-model-use-cases).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in TYPESAFE_API_KEY
npm run dev
```

## Deploying to Vercel

```bash
vercel deploy
```

Set `TYPESAFE_API_KEY` as an environment variable in the Vercel project settings (or via
`vercel env add TYPESAFE_API_KEY`) before deploying — it's read server-side only and is never
bundled into client code.
