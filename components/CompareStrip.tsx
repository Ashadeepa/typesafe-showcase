export interface CompareStripProps {
  n: number;
  jevMs: number;
  otherMs: number;
  otherCostUsd: number;
  agreementPct: number;
  providerLabel: string;
}

/** Shared aggregate Jev-vs-comparison-model summary, used across every demo's comparison UI. */
export default function CompareStrip({ n, jevMs, otherMs, otherCostUsd, agreementPct, providerLabel }: CompareStripProps) {
  return (
    <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
        Jev vs {providerLabel} · {n} item{n === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-ink-secondary">
        <span>
          Jev <b className="tabular-nums text-ink-primary">{Math.round(jevMs)}ms</b>
        </span>
        <span>
          {providerLabel} <b className="tabular-nums text-ink-primary">{Math.round(otherMs)}ms</b> ·{" "}
          <b className="tabular-nums text-ink-primary">${otherCostUsd.toFixed(5)}</b>
        </span>
        <span>
          Agreement <b className="tabular-nums text-ink-primary">{(agreementPct * 100).toFixed(0)}%</b>
        </span>
      </div>
    </div>
  );
}
