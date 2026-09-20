"use client";

import { useEffect, useRef, useState } from "react";
import { classifyBilling } from "./actions";
import { TICKETS, type Ticket } from "@/lib/data";
import { useApiKey } from "@/lib/api-key-context";

const TOTAL_ROUNDS = 10;
const PLAYER_TIMEOUT_MS = 5000;

type PlayerAnswer = boolean | "timeout" | null;
type Outcome = "won" | "lost" | "disagree" | "missed";

interface RoundTracker {
  id: number;
  ticket: Ticket;
  t0: number;
  playerAnswer: PlayerAnswer;
  playerMs: number | null;
  jevAnswer: boolean | null;
  jevMs: number | null;
  jevConfidence: number | null;
  resolved: boolean;
}

interface RoundResult {
  ticket: Ticket;
  playerAnswer: PlayerAnswer;
  playerMs: number | null;
  jevAnswer: boolean;
  jevMs: number;
  confidence: number;
  outcome: Outcome;
}

type Phase = "idle" | "playing" | "roundResult" | "error" | "finished";

const OUTCOME_META: Record<Outcome, { label: string; color: string; points: number }> = {
  won: { label: "You beat Jev", color: "var(--status-good)", points: 100 },
  lost: { label: "Jev was faster", color: "var(--series-2)", points: 40 },
  disagree: { label: "You disagreed with Jev", color: "var(--status-critical)", points: 0 },
  missed: { label: "No answer in time", color: "var(--status-critical)", points: 0 },
};

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fmtMs(ms: number | null): string {
  return ms === null ? "—" : `${Math.round(ms)}ms`;
}

export default function ReflexGame() {
  const { apiKey } = useApiKey();
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [waitingForJev, setWaitingForJev] = useState(false);

  const roundRef = useRef<RoundTracker | null>(null);
  const queueRef = useRef<Ticket[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Authoritative round count for control flow — `round` state is for display only. Reading
  // `round` (or any other plain state var) inside finishRound's setTimeout would close over
  // whichever render was active when that *first* round started, since auto-advance re-calls
  // startRound/finishRound through that same stale closure chain rather than a fresh render.
  const roundCountRef = useRef(0);
  // Same staleness hazard as roundCountRef — keep the live apiKey available to the same
  // stale-closure chain without needing a fresh render.
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function finishRound(r: RoundTracker) {
    if (r.resolved) return;
    if (r.playerAnswer === null || r.jevAnswer === null) return;
    r.resolved = true;

    let outcome: Outcome;
    if (r.playerAnswer === "timeout") {
      outcome = "missed";
    } else if (r.playerAnswer !== r.jevAnswer) {
      outcome = "disagree";
    } else if ((r.playerMs ?? Infinity) < (r.jevMs ?? Infinity)) {
      outcome = "won";
    } else {
      outcome = "lost";
    }

    const result: RoundResult = {
      ticket: r.ticket,
      playerAnswer: r.playerAnswer,
      playerMs: r.playerAnswer === "timeout" ? null : r.playerMs,
      jevAnswer: r.jevAnswer,
      jevMs: r.jevMs!,
      confidence: r.jevConfidence!,
      outcome,
    };

    setScore((s) => s + OUTCOME_META[outcome].points);
    setHistory((h) => [...h, result]);
    setLastResult(result);
    setWaitingForJev(false);
    setPhase("roundResult");

    const t = setTimeout(() => {
      if (roundCountRef.current >= TOTAL_ROUNDS) setPhase("finished");
      else startRound();
    }, 1800);
    timersRef.current.push(t);
  }

  function startRound() {
    if (queueRef.current.length === 0) queueRef.current = shuffled(TICKETS);
    const nextTicket = queueRef.current.shift()!;
    const id = ++counterRef.current;
    roundCountRef.current += 1;

    setRound(roundCountRef.current);
    setTicket(nextTicket);
    setLastResult(null);
    setError(null);
    setWaitingForJev(false);
    setPhase("playing");

    const tracker: RoundTracker = {
      id,
      ticket: nextTicket,
      t0: performance.now(),
      playerAnswer: null,
      playerMs: null,
      jevAnswer: null,
      jevMs: null,
      jevConfidence: null,
      resolved: false,
    };
    roundRef.current = tracker;

    const timeout = setTimeout(() => {
      const r = roundRef.current;
      if (!r || r.id !== id || r.playerAnswer !== null) return;
      r.playerAnswer = "timeout";
      finishRound(r);
    }, PLAYER_TIMEOUT_MS);
    timersRef.current.push(timeout);

    classifyBilling(apiKeyRef.current, nextTicket.text)
      .then((verdict) => {
        const r = roundRef.current;
        if (!r || r.id !== id) return;
        r.jevAnswer = verdict.isBilling;
        r.jevMs = performance.now() - r.t0;
        r.jevConfidence = verdict.noul;
        finishRound(r);
      })
      .catch((e) => {
        const r = roundRef.current;
        if (!r || r.id !== id) return;
        setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
        setPhase("error");
      });
  }

  function answer(choice: boolean) {
    const r = roundRef.current;
    if (!r || r.resolved || r.playerAnswer !== null) return;
    r.playerAnswer = choice;
    r.playerMs = performance.now() - r.t0;
    if (r.jevAnswer === null) setWaitingForJev(true);
    finishRound(r);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "b") answer(true);
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") answer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGame() {
    clearTimers();
    queueRef.current = shuffled(TICKETS);
    counterRef.current = 0;
    roundCountRef.current = 0;
    setScore(0);
    setRound(0);
    setHistory([]);
    setError(null);
    startRound();
  }

  function skipAfterError() {
    setError(null);
    if (roundCountRef.current >= TOTAL_ROUNDS) setPhase("finished");
    else startRound();
  }

  const wins = history.filter((h) => h.outcome === "won").length;
  const losses = history.filter((h) => h.outcome === "lost").length;
  const disagreements = history.filter((h) => h.outcome === "disagree" || h.outcome === "missed").length;
  const decided = history.filter((h) => h.playerMs !== null);
  const avgPlayerMs = decided.length ? decided.reduce((s, h) => s + (h.playerMs ?? 0), 0) / decided.length : 0;
  const avgJevMs = history.length ? history.reduce((s, h) => s + h.jevMs, 0) / history.length : 0;
  const agreementRate = history.length
    ? history.filter((h) => h.outcome === "won" || h.outcome === "lost").length / history.length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
        <span>
          Round <b className="text-ink-primary tabular-nums">{Math.min(round, TOTAL_ROUNDS)}</b>/{TOTAL_ROUNDS}
        </span>
        <span>Score <b className="text-ink-primary tabular-nums">{score}</b></span>
        <span>
          You <b className="text-ink-primary tabular-nums">{wins}</b> – <b className="text-ink-primary tabular-nums">{losses}</b> Jev
          {disagreements > 0 && <span className="text-ink-muted"> ({disagreements} no-match)</span>}
        </span>
      </div>

      <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-border-hairline bg-chart-surface p-6 text-center">
        {phase === "idle" && (
          <>
            <p className="max-w-sm text-sm text-ink-secondary">
              A support ticket appears. Guess "Billing" or "Not billing" before Jev's own answer
              comes back — you're racing its real response time, not a countdown.
            </p>
            <button
              onClick={startGame}
              disabled={!apiKey}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--series-1)" }}
            >
              Start the match
            </button>
            {!apiKey && <p className="text-xs text-ink-muted">Enter your TypeSafe API key above first.</p>}
          </>
        )}

        {phase === "error" && (
          <>
            <p className="text-sm" style={{ color: "var(--status-critical)" }}>
              ⚠ {error}
            </p>
            <button
              onClick={skipAfterError}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--series-1)" }}
            >
              Skip this round
            </button>
          </>
        )}

        {phase === "playing" && ticket && (
          <>
            <p className="max-w-md text-base text-ink-primary">&ldquo;{ticket.text}&rdquo;</p>
            <div className="flex gap-3">
              <button
                onClick={() => answer(true)}
                className="rounded-md border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--series-1)", color: "var(--series-1)" }}
              >
                ← Billing
              </button>
              <button
                onClick={() => answer(false)}
                className="rounded-md border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--ink-muted)", color: "var(--ink-secondary)" }}
              >
                Not billing →
              </button>
            </div>
            {waitingForJev && <p className="text-xs text-ink-muted">waiting on Jev…</p>}
          </>
        )}

        {phase === "roundResult" && lastResult && (
          <>
            <p className="max-w-md text-sm text-ink-secondary">&ldquo;{lastResult.ticket.text}&rdquo;</p>
            <p className="text-base font-semibold" style={{ color: OUTCOME_META[lastResult.outcome].color }}>
              {OUTCOME_META[lastResult.outcome].label}
            </p>
            <p className="text-xs text-ink-muted">
              You: {lastResult.playerAnswer === "timeout" ? "no answer" : lastResult.playerAnswer ? "Billing" : "Not billing"} (
              {fmtMs(lastResult.playerMs)}) · Jev: {lastResult.jevAnswer ? "Billing" : "Not billing"} (
              {fmtMs(lastResult.jevMs)}, conf {lastResult.confidence.toFixed(2)})
            </p>
          </>
        )}

        {phase === "finished" && (
          <>
            <h3 className="text-lg font-semibold text-ink-primary">Match complete</h3>
            <p className="text-sm text-ink-secondary">
              Final score {score} · You {wins} – {losses} Jev
              {disagreements > 0 && ` (${disagreements} no-match)`}
            </p>
            <p className="text-xs text-ink-muted">
              Avg your reaction: {avgPlayerMs ? Math.round(avgPlayerMs) : "—"}ms · avg Jev response:{" "}
              {Math.round(avgJevMs)}ms · agreement rate {(agreementRate * 100).toFixed(0)}%
            </p>
            <button
              onClick={startGame}
              className="mt-1 rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--series-1)" }}
            >
              Play again
            </button>
          </>
        )}
      </div>

      {phase === "playing" && (
        <p className="text-center text-xs text-ink-muted">← / B for billing · → / N for not billing</p>
      )}
    </div>
  );
}
