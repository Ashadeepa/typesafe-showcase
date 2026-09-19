"use client";

import { useState, useTransition } from "react";
import { runParallel, runSequential, type RunResult } from "./actions";
import { TICKETS } from "@/lib/data";

type RunState = { sequential: RunResult | null; parallel: RunResult | null };

function TimingChart({ sequential, parallel }: { sequential: RunResult; parallel: RunResult }) {
  const max = Math.max(sequential.elapsedMs, parallel.elapsedMs, 1);
  const bars = [
    { label: "Sequential", ms: sequential.elapsedMs, color: "var(--series-1)" },
    { label: "Parallel", ms: parallel.elapsedMs, color: "var(--series-2)" },
  ];
  const speedup = sequential.elapsedMs / parallel.elapsedMs;

  return (
    <div
      className="rounded-lg border border-border-hairline bg-chart-surface p-5"
      role="img"
      aria-label={`Sequential took ${(sequential.elapsedMs / 1000).toFixed(2)} seconds; parallel took ${(parallel.elapsedMs / 1000).toFixed(2)} seconds — ${speedup.toFixed(1)}x speedup`}
    >
      <div className="flex flex-col gap-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-3" title={`${bar.label}: ${(bar.ms / 1000).toFixed(2)}s`}>
            <span className="w-20 shrink-0 text-sm text-ink-secondary">{bar.label}</span>
            <div className="relative h-6 flex-1 rounded-sm bg-gridline">
              <div
                className="h-6 rounded-sm transition-[width] duration-500"
                style={{ width: `${(bar.ms / max) * 100}%`, backgroundColor: bar.color }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink-primary">
              {(bar.ms / 1000).toFixed(2)}s
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-secondary">
        <span className="font-semibold text-ink-primary">{speedup.toFixed(1)}x</span> speedup — same{" "}
        {sequential.inputTokens}/{sequential.outputTokens} input/output tokens either way.
      </p>
    </div>
  );
}

function TicketRow({ id, text, noulValue }: { id: number; text: string; noulValue: number | undefined }) {
  const isBilling = (noulValue ?? 0) > 0.5;
  return (
    <li className="flex items-start gap-3 border-b border-gridline py-2 last:border-0">
      <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-ink-muted">{id}</span>
      <span className="flex-1 text-sm text-ink-primary">{text}</span>
      {noulValue !== undefined ? (
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-hairline px-2 py-0.5 text-xs font-medium"
          style={{ color: isBilling ? "var(--series-1)" : "var(--ink-muted)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isBilling ? "var(--series-1)" : "var(--ink-muted)" }}
          />
          {isBilling ? "Billing" : "Other"} · {noulValue.toFixed(2)}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-ink-muted">—</span>
      )}
    </li>
  );
}

export default function ParallelDemo() {
  const [runs, setRuns] = useState<RunState>({ sequential: null, parallel: null });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeRun, setActiveRun] = useState<"sequential" | "parallel" | null>(null);

  const trigger = (kind: "sequential" | "parallel") => {
    setError(null);
    setActiveRun(kind);
    startTransition(async () => {
      try {
        const result = kind === "sequential" ? await runSequential() : await runParallel();
        setRuns((prev) => ({ ...prev, [kind]: result }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  const noulById = new Map<number, number>();
  for (const r of runs.parallel?.results ?? runs.sequential?.results ?? []) {
    noulById.set(r.id, r.isBillingNoul);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => trigger("sequential")}
          disabled={pending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-1)" }}
        >
          {pending && activeRun === "sequential" ? "Running sequentially…" : "Run sequential"}
        </button>
        <button
          onClick={() => trigger("parallel")}
          disabled={pending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-2)" }}
        >
          {pending && activeRun === "parallel" ? "Running in parallel…" : "Run parallel"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}>
          ⚠ {error}
        </p>
      )}

      {runs.sequential && runs.parallel && <TimingChart sequential={runs.sequential} parallel={runs.parallel} />}

      <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink-primary">16 sample support tickets</h2>
        <p className="mb-3 text-xs text-ink-muted">
          Run a check above to see each ticket judged "is this about billing?" — the badge shows the
          model&rsquo;s probability (Noul), not a keyword match.
        </p>
        <ul>
          {TICKETS.map((t) => (
            <TicketRow key={t.id} id={t.id} text={t.text} noulValue={noulById.get(t.id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
