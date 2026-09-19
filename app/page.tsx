import Link from "next/link";

const USE_CASES = [
  {
    href: "/parallel",
    title: "Parallel processing",
    primitive: "Noul",
    color: "var(--series-1)",
    description:
      "16 support tickets, judged “is this about billing?” one at a time vs. all at once — same answers, ~5x faster.",
  },
  {
    href: "/citation",
    title: "Citation / claim check",
    primitive: "Choice",
    color: "var(--series-2)",
    description:
      "A hallucination detector: verifies whether a claim is actually supported by the policy document it cites.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">TypeSafe · System One (Jev)</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink-primary">Show &amp; tell use cases</h1>
      <p className="mt-3 text-sm text-ink-secondary">
        Small, runnable demos of typed judgments replacing hand-rolled parsing or keyword matching.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {USE_CASES.map((uc) => (
          <Link
            key={uc.href}
            href={uc.href}
            className="rounded-lg border border-border-hairline bg-chart-surface p-5 transition-colors hover:border-[var(--baseline)]"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: uc.color }} />
              <h2 className="text-base font-semibold text-ink-primary">{uc.title}</h2>
              <span className="ml-auto rounded-full border border-border-hairline px-2 py-0.5 text-xs text-ink-muted">
                {uc.primitive}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{uc.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
