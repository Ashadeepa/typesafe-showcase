export interface CompareStripProps {
  n: number;
  jevMs: number;
  geminiMs: number;
  geminiCostUsd: number;
  agreementPct: number;
}

/** Shared aggregate Jev-vs-Gemini summary for the batch demos (parallel, citation, tone). */
export default function CompareStrip({ n, jevMs, geminiMs, geminiCostUsd, agreementPct }: CompareStripProps) {
  return (
    <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
        Jev vs Gemini 3.5 Flash-Lite · {n} item{n === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-ink-secondary">
        <span>
          Jev <b className="tabular-nums text-ink-primary">{Math.round(jevMs)}ms</b>
        </span>
        <span>
          Gemini <b className="tabular-nums text-ink-primary">{Math.round(geminiMs)}ms</b> ·{" "}
          <b className="tabular-nums text-ink-primary">${geminiCostUsd.toFixed(5)}</b>
        </span>
        <span>
          Agreement <b className="tabular-nums text-ink-primary">{(agreementPct * 100).toFixed(0)}%</b>
        </span>
      </div>
    </div>
  );
}
