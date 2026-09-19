"use client";

import { useState, useTransition } from "react";
import { runToneCheck, runToneCheckCustom, type NoteResult } from "./actions";
import { NOTES } from "@/lib/data";

const MAX_SCORE = 3;

const LEVEL_COLOR: Record<string, string> = {
  Good: "var(--status-good)",
  Warning: "var(--status-warning)",
  Serious: "var(--status-serious)",
  Critical: "var(--status-critical)",
};

function Meter({ result }: { result: NoteResult }) {
  const color = LEVEL_COLOR[result.levelLabel] ?? "var(--ink-muted)";
  const pct = (result.score / MAX_SCORE) * 100;
  return (
    <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-primary">&ldquo;{result.text}&rdquo;</p>
          <p className="mt-0.5 text-xs text-ink-muted">{result.context}</p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: color, color }}
        >
          {result.levelLabel}
        </span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-gridline">
        <div
          className="absolute h-2 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-right text-xs tabular-nums text-ink-muted">
        {result.score.toFixed(2)} / {MAX_SCORE} · confidence {result.confidence.toFixed(2)}
      </p>
    </div>
  );
}

function TryYourOwn() {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<NoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        setResult(await runToneCheckCustom(text, context));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink-primary">Try your own</h2>
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Paste a message or note…"
          className="w-full rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
        />
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={500}
          placeholder="Where was it said? (optional, e.g. &quot;text from my roommate&quot;)"
          className="w-full rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
        />
        <button
          onClick={run}
          disabled={pending || !text.trim()}
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
        <div className="mt-3">
          <Meter result={result} />
        </div>
      )}
    </div>
  );
}

export default function ToneDemo() {
  const [results, setResults] = useState<NoteResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        setResults(await runToneCheck());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      }
    });
  };

  const champion = results?.[0];

  return (
    <div className="flex flex-col gap-6">
      <TryYourOwn />

      <button
        onClick={run}
        disabled={pending}
        className="self-start rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--series-1)" }}
      >
        {pending ? "Reading the room…" : "Run the meter"}
      </button>

      {error && (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}
        >
          ⚠ {error}
        </p>
      )}

      {champion && champion.score > 1.5 && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}
        >
          🏆 Most passive-aggressive: &ldquo;{champion.text}&rdquo;
        </div>
      )}

      <div className="flex flex-col gap-3">
        {results
          ? results.map((r) => <Meter key={r.id} result={r} />)
          : NOTES.map((n) => (
              <div key={n.id} className="rounded-lg border border-border-hairline bg-chart-surface p-4">
                <p className="text-sm text-ink-primary">&ldquo;{n.text}&rdquo;</p>
                <p className="mt-0.5 text-xs text-ink-muted">{n.context}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
