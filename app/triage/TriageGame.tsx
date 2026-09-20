"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyTicket, type TriageVerdict } from "./actions";
import { TRIAGE_TICKETS, type TriageCategory, type TriageTicket } from "@/lib/triage-data";
import { useApiKey } from "@/lib/api-key-context";

const LANES: { key: TriageCategory; label: string; color: string }[] = [
  { key: "billing", label: "Billing", color: "var(--series-1)" },
  { key: "bug", label: "Bug", color: "var(--status-critical)" },
  { key: "feature", label: "Feature", color: "var(--series-2)" },
  { key: "praise", label: "Praise", color: "var(--status-good)" },
];

const START_LIVES = 3;
const START_FALL_MS = 6500;
const MIN_FALL_MS = 2200;
const FALL_STEP_MS = 250;

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Phase = "idle" | "falling" | "judging" | "result" | "gameover";

interface RoundRecord {
  correct: boolean;
  confidenceOfTruth: number;
  latencyMs: number;
}

export default function TriageGame() {
  const { apiKey } = useApiKey();
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<TriageTicket[]>([]);
  const [ticket, setTicket] = useState<TriageTicket | null>(null);
  const [lane, setLane] = useState(0);
  const [fallMs, setFallMs] = useState(START_FALL_MS);
  const [falling, setFalling] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [result, setResult] = useState<{ verdict: TriageVerdict; chosen: TriageCategory; correct: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const correct = history.filter((h) => h.correct).length;
    const avgLatency = total ? history.reduce((s, h) => s + h.latencyMs, 0) / total : 0;
    const avgConfidence = total ? history.reduce((s, h) => s + h.confidenceOfTruth, 0) / total : 0;
    return { total, correct, accuracy: total ? correct / total : 0, avgLatency, avgConfidence };
  }, [history]);

  function nextTicket(q: TriageTicket[]) {
    let nextQueue = q;
    if (nextQueue.length === 0) nextQueue = shuffled(TRIAGE_TICKETS);
    const [head, ...rest] = nextQueue;
    setTicket(head);
    setQueue(rest);
    setLane(0);
    setError(null);
    setResult(null);
    setPhase("falling");
    requestAnimationFrame(() => requestAnimationFrame(() => setFalling(true)));
    timeoutRef.current = setTimeout(() => land(head, laneRef.current), fallMsRef.current);
  }

  // Refs so the setTimeout callback always sees latest values without re-arming on every keystroke.
  const laneRef = useRef(lane);
  laneRef.current = lane;
  const fallMsRef = useRef(fallMs);
  fallMsRef.current = fallMs;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  async function land(landedTicket: TriageTicket, chosenLaneIndex: number) {
    setFalling(false);
    setPhase("judging");
    const chosen = LANES[chosenLaneIndex].key;
    const start = performance.now();
    try {
      const verdict = await classifyTicket(apiKeyRef.current, landedTicket.text);
      const latencyMs = performance.now() - start;
      const correct = verdict.category === chosen;
      setHistory((h) => [...h, { correct, confidenceOfTruth: verdict.confidence, latencyMs }]);
      setResult({ verdict, chosen, correct });
      setPhase("result");

      let livesAfter = lives;
      if (correct) {
        const gain = Math.round(80 + verdict.confidence * 60 + streak * 10);
        setScore((s) => s + gain);
        setStreak((s) => s + 1);
        setFallMs((ms) => Math.max(MIN_FALL_MS, ms - FALL_STEP_MS));
      } else {
        livesAfter = lives - 1;
        setLives(livesAfter);
        setStreak(0);
      }

      timeoutRef.current = setTimeout(() => {
        if (livesAfter <= 0) setPhase("gameover");
        else nextTicket(queueRef.current);
      }, 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      setPhase("idle");
    }
  }

  const queueRef = useRef(queue);
  queueRef.current = queue;

  function startGame() {
    setScore(0);
    setStreak(0);
    setLives(START_LIVES);
    setFallMs(START_FALL_MS);
    setHistory([]);
    setError(null);
    nextTicket(shuffled(TRIAGE_TICKETS));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "falling") return;
      if (e.key === "ArrowLeft") setLane((l) => Math.max(0, l - 1));
      else if (e.key === "ArrowRight") setLane((l) => Math.min(LANES.length - 1, l + 1));
      else if (["1", "2", "3", "4"].includes(e.key)) setLane(Number(e.key) - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
        <span>Score <b className="text-ink-primary tabular-nums">{score}</b></span>
        <span>Streak <b className="text-ink-primary tabular-nums">{streak}</b></span>
        <span>Lives <b className="text-ink-primary">{"♥".repeat(Math.max(0, lives))}{"·".repeat(Math.max(0, START_LIVES - lives))}</b></span>
      </div>

      {error && (
        <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}>
          ⚠ {error}
        </p>
      )}

      <div className="relative h-[380px] overflow-hidden rounded-lg border border-border-hairline bg-chart-surface">
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="max-w-xs text-sm text-ink-secondary">
              A ticket falls. Steer it into the right lane before it lands — Jev judges the real
              category the instant it does.
            </p>
            <button
              onClick={startGame}
              disabled={!apiKey}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--series-1)" }}
            >
              Start sorting
            </button>
            {!apiKey && <p className="text-xs text-ink-muted">Enter your TypeSafe API key above first.</p>}
          </div>
        )}

        {phase === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <h3 className="font-semibold text-ink-primary">Out of lives</h3>
            <p className="text-sm text-ink-secondary">Final score: {score}</p>
            <p className="text-xs text-ink-muted">
              {stats.total} sorted · {(stats.accuracy * 100).toFixed(0)}% accuracy · avg confidence{" "}
              {stats.avgConfidence.toFixed(2)} · avg judgment {stats.avgLatency.toFixed(0)}ms
            </p>
            <button
              onClick={startGame}
              className="mt-2 rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--series-1)" }}
            >
              Play again
            </button>
          </div>
        )}

        {(phase === "falling" || phase === "judging" || phase === "result") && ticket && (
          <>
            <div className="absolute inset-x-0 top-0 grid grid-cols-4 border-b border-gridline text-center text-xs font-medium">
              {LANES.map((l, i) => (
                <button
                  key={l.key}
                  onClick={() => phase === "falling" && setLane(i)}
                  className="border-r border-gridline py-2 last:border-r-0"
                  style={{ color: lane === i ? l.color : "var(--ink-muted)" }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div
              className="absolute w-1/4 px-2 transition-[left] duration-150 ease-out"
              style={{
                left: `${lane * 25}%`,
                top: falling ? "calc(100% - 96px)" : "36px",
                transitionProperty: "left, top",
                transitionDuration: falling ? `150ms, ${fallMs}ms` : "150ms, 0ms",
                transitionTimingFunction: "ease-out, linear",
              }}
            >
              <div
                className="rounded-md border p-3 text-xs shadow-sm"
                style={{
                  borderColor: LANES[lane].color,
                  backgroundColor: "var(--panel, var(--chart-surface))",
                  color: "var(--ink-primary)",
                }}
              >
                {ticket.text}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-10 border-t-2 border-dashed" style={{ borderColor: "var(--ink-muted)" }} />

            {(phase === "judging" || phase === "result") && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 border-t border-gridline bg-chart-surface p-2 text-center text-xs">
                {phase === "judging" && <span className="text-ink-muted">asking Jev…</span>}
                {phase === "result" && result && (
                  <span style={{ color: result.correct ? "var(--status-good)" : "var(--status-critical)" }}>
                    {result.correct ? "✓ correct" : "✕ wrong"} — Jev says{" "}
                    <b>{LANES.find((l) => l.key === result.verdict.category)?.label}</b> (
                    {result.verdict.confidence.toFixed(2)})
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {phase === "falling" && (
        <p className="text-center text-xs text-ink-muted">← → or 1–4 to pick a lane before it lands</p>
      )}

      {history.length > 0 && phase !== "gameover" && (
        <p className="text-center text-xs text-ink-muted">
          {stats.total} sorted this run · {(stats.accuracy * 100).toFixed(0)}% accuracy · avg judgment{" "}
          {stats.avgLatency.toFixed(0)}ms
        </p>
      )}
    </div>
  );
}
