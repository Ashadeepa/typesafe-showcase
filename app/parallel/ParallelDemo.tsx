"use client";

import { useState, useTransition } from "react";
import { runParallel, runSequential, runCompareBatch, type RunResult, type CompareRunResult } from "./actions";
import { TICKETS } from "@/lib/data";
import { useApiKey } from "@/lib/api-key-context";
import { useCompareModel } from "@/lib/compare-key-context";
import { PROVIDER_LABEL } from "@/lib/compare-model-shared";
import CompareStrip from "@/components/CompareStrip";

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

function TicketRow({
  id,
  text,
  noulValue,
  custom,
}: {
  id: number;
  text: string;
  noulValue: number | undefined;
  custom?: boolean;
}) {
  const isBilling = (noulValue ?? 0) > 0.5;
  return (
    <li className="flex items-start gap-3 border-b border-gridline py-2 last:border-0">
      <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-ink-muted">
        {custom ? "★" : id}
      </span>
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

const MAX_EXTRA_TICKETS = 10;

export default function ParallelDemo() {
  const { apiKey } = useApiKey();
  const { provider, compareKey } = useCompareModel();
  const [runs, setRuns] = useState<RunState>({ sequential: null, parallel: null });
  const [compareRun, setCompareRun] = useState<CompareRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeRun, setActiveRun] = useState<"sequential" | "parallel" | "compare" | null>(null);
  const [customTickets, setCustomTickets] = useState<string[]>([]);
  const [newTicketText, setNewTicketText] = useState("");

  const addTicket = () => {
    const text = newTicketText.trim();
    if (!text || customTickets.length >= MAX_EXTRA_TICKETS) return;
    setCustomTickets((prev) => [...prev, text]);
    setNewTicketText("");
    setRuns({ sequential: null, parallel: null });
    setCompareRun(null);
  };

  const removeTicket = (index: number) => {
    setCustomTickets((prev) => prev.filter((_, i) => i !== index));
    setRuns({ sequential: null, parallel: null });
    setCompareRun(null);
  };

  const trigger = (kind: "sequential" | "parallel") => {
    setError(null);
    setActiveRun(kind);
    startTransition(async () => {
      try {
        const result =
          kind === "sequential"
            ? await runSequential(apiKey, customTickets)
            : await runParallel(apiKey, customTickets);
        setRuns((prev) => ({ ...prev, [kind]: result }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  const triggerCompare = () => {
    setError(null);
    setActiveRun("compare");
    startTransition(async () => {
      try {
        setCompareRun(await runCompareBatch(provider, compareKey, customTickets));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling the comparison model.");
      }
    });
  };

  const noulById = new Map<number, number>();
  for (const r of runs.parallel?.results ?? runs.sequential?.results ?? []) {
    noulById.set(r.id, r.isBillingNoul);
  }

  let compareStats:
    | { jevMs: number; jevInputTokens: number; jevOutputTokens: number; otherMs: number; otherCostUsd: number; agreementPct: number; n: number; providerLabel: string }
    | null = null;
  if (compareRun && (runs.parallel || runs.sequential)) {
    const jevRun = (runs.parallel ?? runs.sequential)!;
    let agree = 0;
    for (const g of compareRun.results) {
      const jevSaysBilling = (noulById.get(g.id) ?? 0) > 0.5;
      const otherSaysBilling = g.isBillingProbability > 0.5;
      if (jevSaysBilling === otherSaysBilling) agree++;
    }
    compareStats = {
      jevMs: jevRun.elapsedMs,
      jevInputTokens: jevRun.inputTokens,
      jevOutputTokens: jevRun.outputTokens,
      otherMs: compareRun.elapsedMs,
      otherCostUsd: compareRun.costUsd,
      agreementPct: compareRun.results.length ? agree / compareRun.results.length : 0,
      n: compareRun.results.length,
      providerLabel: PROVIDER_LABEL[provider],
    };
  }

  const allTickets = [
    ...TICKETS,
    ...customTickets.map((text, i) => ({ id: 1000 + i, text, custom: true })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">Add your own ticket</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={newTicketText}
            onChange={(e) => setNewTicketText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTicket()}
            maxLength={500}
            disabled={customTickets.length >= MAX_EXTRA_TICKETS}
            placeholder="Type a support ticket to add to the batch…"
            className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
          />
          <button
            onClick={addTicket}
            disabled={!newTicketText.trim() || customTickets.length >= MAX_EXTRA_TICKETS}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--series-2)" }}
          >
            Add
          </button>
        </div>
        {customTickets.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {customTickets.map((text, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink-secondary">
                <button
                  onClick={() => removeTicket(i)}
                  aria-label="Remove ticket"
                  className="text-ink-muted hover:text-ink-primary"
                >
                  ✕
                </button>
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => trigger("sequential")}
          disabled={pending || !apiKey}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-1)" }}
        >
          {pending && activeRun === "sequential" ? "Running sequentially…" : "Run sequential"}
        </button>
        <button
          onClick={() => trigger("parallel")}
          disabled={pending || !apiKey}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--series-2)" }}
        >
          {pending && activeRun === "parallel" ? "Running in parallel…" : "Run parallel"}
        </button>
        {compareKey && (runs.sequential || runs.parallel) && (
          <button
            onClick={triggerCompare}
            disabled={pending}
            className="rounded-md border border-border-hairline px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary disabled:opacity-50"
          >
            {pending && activeRun === "compare" ? `Comparing with ${PROVIDER_LABEL[provider]}…` : `Compare with ${PROVIDER_LABEL[provider]}`}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}>
          ⚠ {error}
        </p>
      )}

      {runs.sequential && runs.parallel && <TimingChart sequential={runs.sequential} parallel={runs.parallel} />}
      {compareStats && <CompareStrip {...compareStats} />}

      <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink-primary">
          {TICKETS.length} sample support tickets{customTickets.length > 0 && ` + ${customTickets.length} of your own`}
        </h2>
        <p className="mb-3 text-xs text-ink-muted">
          Run a check above to see each ticket judged "is this about billing?" — the badge shows the
          model&rsquo;s probability (Noul), not a keyword match.
        </p>
        <ul>
          {allTickets.map((t) => (
            <TicketRow
              key={t.id}
              id={t.id}
              text={t.text}
              noulValue={noulById.get(t.id)}
              custom={"custom" in t}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
