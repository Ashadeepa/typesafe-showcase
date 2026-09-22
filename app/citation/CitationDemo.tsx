"use client";

import { useState, useTransition } from "react";
import { checkCustomClaim, runCitationCheck, runCompareCitationCheck, type ClaimResult, type CompareCitationResult, type Verdict } from "./actions";
import { SOURCES, CONFIDENCE_THRESHOLD } from "@/lib/data";
import { useApiKey } from "@/lib/api-key-context";
import { useCompareModel } from "@/lib/compare-key-context";
import { PROVIDER_LABEL } from "@/lib/compare-model-shared";
import CompareStrip from "@/components/CompareStrip";

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

function TryYourOwn() {
  const { apiKey } = useApiKey();
  const [claim, setClaim] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        setResult(await checkCustomClaim(apiKey, claim, sourceText));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink-primary">Try your own</h2>
      <div className="flex flex-col gap-2">
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Paste the source text (a policy, a document excerpt, anything)…"
          className="w-full rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
        />
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Paste the claim to check against it…"
          className="w-full rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
        />
        <button
          onClick={run}
          disabled={pending || !claim.trim() || !sourceText.trim() || !apiKey}
          className="self-start rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-2)" }}
        >
          {pending ? "Checking…" : "Check it"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--status-critical)" }}>
          ⚠ {error}
        </p>
      )}

      {result && (
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-gridline pt-4">
          <p className="text-sm text-ink-primary">&ldquo;{result.claim}&rdquo;</p>
          <VerdictBadge verdict={result.verdict} confidence={result.confidence} />
        </div>
      )}
    </div>
  );
}

export default function CitationDemo() {
  const { apiKey } = useApiKey();
  const { provider, compareKey } = useCompareModel();
  const [results, setResults] = useState<ClaimResult[] | null>(null);
  const [jevMs, setJevMs] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<CompareCitationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [comparePending, startCompareTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        const start = performance.now();
        const r = await runCitationCheck(apiKey);
        setJevMs(performance.now() - start);
        setResults(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  const runCompare = () => {
    setError(null);
    startCompareTransition(async () => {
      try {
        setCompareResult(await runCompareCitationCheck(provider, compareKey));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling the comparison model.");
      }
    });
  };

  const needsReview = (results ?? []).filter(
    (r) => r.verdict !== "supports" || r.confidence < CONFIDENCE_THRESHOLD,
  );

  let compareStats:
    | { jevMs: number; jevInputTokens: number; jevOutputTokens: number; otherMs: number; otherCostUsd: number; agreementPct: number; n: number; providerLabel: string }
    | null = null;
  if (results && jevMs !== null && compareResult) {
    const verdictById = new Map(results.map((r) => [r.id, r.verdict]));
    let agree = 0;
    for (const g of compareResult.results) {
      if (verdictById.get(g.id) === g.verdict) agree++;
    }
    compareStats = {
      jevMs,
      jevInputTokens: results.reduce((s, r) => s + r.inputTokens, 0),
      jevOutputTokens: results.reduce((s, r) => s + r.outputTokens, 0),
      otherMs: compareResult.elapsedMs,
      otherCostUsd: compareResult.costUsd,
      agreementPct: compareResult.results.length ? agree / compareResult.results.length : 0,
      n: compareResult.results.length,
      providerLabel: PROVIDER_LABEL[provider],
    };
  }

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

      <TryYourOwn />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={run}
          disabled={pending || !apiKey}
          className="self-start rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-1)" }}
        >
          {pending ? "Checking claims…" : "Run citation check"}
        </button>
        {compareKey && results && (
          <button
            onClick={runCompare}
            disabled={comparePending}
            className="self-start rounded-md border border-border-hairline px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary disabled:opacity-50"
          >
            {comparePending ? `Comparing with ${PROVIDER_LABEL[provider]}…` : `Compare with ${PROVIDER_LABEL[provider]}`}
          </button>
        )}
      </div>

      {compareStats && <CompareStrip {...compareStats} />}

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
