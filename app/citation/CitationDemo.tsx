"use client";

import { useState, useTransition } from "react";
import { runCitationCheck, type ClaimResult, type Verdict } from "./actions";
import { SOURCES, CONFIDENCE_THRESHOLD } from "@/lib/data";

const VERDICT_META: Record<Verdict, { label: string; icon: string; color: string }> = {
  supports: { label: "Supports", icon: "✓", color: "var(--status-good)" },
  contradicts: { label: "Contradicts", icon: "✕", color: "var(--status-critical)" },
  says_nothing: { label: "Says nothing", icon: "?", color: "var(--status-warning)" },
};

function VerdictBadge({ verdict, confidence }: { verdict: Verdict; confidence: number }) {
  const meta = VERDICT_META[verdict];
  const lowConfidence = confidence < CONFIDENCE_THRESHOLD;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: meta.color, color: meta.color }}
      title={lowConfidence ? "Low confidence — flagged for human review" : undefined}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
      <span className="tabular-nums text-ink-muted">{confidence.toFixed(2)}</span>
      {lowConfidence && <span aria-hidden style={{ color: "var(--status-warning)" }}>⚠</span>}
    </span>
  );
}

export default function CitationDemo() {
  const [results, setResults] = useState<ClaimResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        setResults(await runCitationCheck());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  const needsReview = (results ?? []).filter(
    (r) => r.verdict !== "supports" || r.confidence < CONFIDENCE_THRESHOLD,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink-primary">Source documents</h2>
        <dl className="flex flex-col gap-2">
          {Object.entries(SOURCES).map(([name, text]) => (
            <div key={name}>
              <dt className="text-xs font-medium text-ink-muted">{name}</dt>
              <dd className="text-sm text-ink-secondary">{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button
        onClick={run}
        disabled={pending}
        className="self-start rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--series-1)" }}
      >
        {pending ? "Checking claims…" : "Run citation check"}
      </button>

      {error && (
        <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}>
          ⚠ {error}
        </p>
      )}

      <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">8 claims, checked against their cited source</h2>
        <ul>
          {(results ?? []).length === 0 && !pending && (
            <li className="text-sm text-ink-muted">Run the check to see verdicts.</li>
          )}
          {(results ?? []).map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 border-b border-gridline py-3 last:border-0">
              <div>
                <p className="text-sm text-ink-primary">&ldquo;{r.claim}&rdquo;</p>
                <p className="mt-0.5 text-xs text-ink-muted">cites {r.source}</p>
              </div>
              <VerdictBadge verdict={r.verdict} confidence={r.confidence} />
            </li>
          ))}
        </ul>
      </div>

      {results && (
        <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
          <h2 className="mb-2 text-sm font-semibold text-ink-primary">
            {needsReview.length} of {results.length} claims need human review
          </h2>
          <p className="mb-3 text-xs text-ink-muted">Contradicted, unsupported, or below {CONFIDENCE_THRESHOLD} confidence.</p>
          {needsReview.length === 0 ? (
            <p className="text-sm text-ink-secondary">Every claim checked out.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {needsReview.map((r) => (
                <li key={r.id} className="text-sm text-ink-secondary">
                  <span style={{ color: VERDICT_META[r.verdict].color }}>{VERDICT_META[r.verdict].label}</span>
                  {" — "}&ldquo;{r.claim}&rdquo;
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
