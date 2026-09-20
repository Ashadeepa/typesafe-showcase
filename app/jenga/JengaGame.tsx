"use client";

import { useState } from "react";
import { judgeRemoval } from "./actions";
import { SENTENCES, COLLAPSE_THRESHOLD, type JengaSentence } from "@/lib/jenga-data";
import { useApiKey } from "@/lib/api-key-context";

type Phase = "setup" | "playing" | "judging" | "collapsed";

interface LastPull {
  word: string;
  stability: number;
}

interface CollapseInfo {
  word: string;
  stability: number;
  attempted: string;
}

function buildSentence(words: string[]): string {
  if (words.length === 0) return "";
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
}

function stability(value: number): { text: string; color: string } {
  if (value >= 0.9) return { text: "solid", color: "var(--status-good)" };
  if (value >= 0.75) return { text: "holding", color: "var(--status-good)" };
  if (value >= 0.62) return { text: "wobbling", color: "var(--status-warning)" };
  return { text: "about to go", color: "var(--status-critical)" };
}

export default function JengaGame() {
  const { apiKey } = useApiKey();
  const [phase, setPhase] = useState<Phase>("setup");
  const [original, setOriginal] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [pulled, setPulled] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState(1);
  const [lastPull, setLastPull] = useState<LastPull | null>(null);
  const [collapse, setCollapse] = useState<CollapseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  function startGame(text: string) {
    const cleaned = text.trim().replace(/[.!?]+$/, "");
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length < 4) {
      setError("Give me at least 4 words to work with.");
      return;
    }
    setOriginal(buildSentence(tokens));
    setWords(tokens);
    setPulled([]);
    setSelected(null);
    setIntegrity(1);
    setLastPull(null);
    setCollapse(null);
    setError(null);
    setPhase("playing");
  }

  async function pull() {
    if (phase !== "playing" || selected === null) return;
    if (words.length <= 1) {
      setError("One word left — there's nothing to pull without knocking it over.");
      return;
    }

    const word = words[selected];
    const remaining = words.filter((_, i) => i !== selected);
    const candidate = buildSentence(remaining);

    setError(null);
    setPhase("judging");

    try {
      const verdict = await judgeRemoval(apiKey, original, candidate);
      if (verdict.holds) {
        setWords(remaining);
        setPulled((p) => [...p, word]);
        setIntegrity(verdict.stability);
        setLastPull({ word, stability: verdict.stability });
        setSelected(null);
        setPhase("playing");
      } else {
        setCollapse({ word, stability: verdict.stability, attempted: candidate });
        setPhase("collapsed");
      }
    } catch (e) {
      // A failed call shouldn't cost a run — keep the selection so they can just try again.
      setError(e instanceof Error ? e.message : "Something went wrong calling TypeSafe.");
      setPhase("playing");
    }
  }

  const meter = stability(integrity);
  const current = buildSentence(words);
  const judging = phase === "judging";
  const collapsed = phase === "collapsed";

  return (
    <div className="flex flex-col gap-5">
      {phase === "setup" && (
        <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Pick a sentence to dismantle</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Pull one word at a time. Jev checks whether the sentence still means what it started out
            meaning. Keep pulling until it breaks.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SENTENCES.map((s: JengaSentence) => (
              <button
                key={s.id}
                onClick={() => startGame(s.text)}
                disabled={!apiKey}
                className="rounded-md border border-border-hairline p-3 text-left text-sm text-ink-secondary transition-colors hover:border-[var(--baseline)] hover:text-ink-primary disabled:opacity-50"
              >
                <span className="text-xs uppercase tracking-wide text-ink-muted">{s.label}</span>
                <span className="mt-1 block">{s.text}.</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-gridline pt-4">
            <label htmlFor="custom-sentence" className="text-xs font-medium text-ink-secondary">
              …or use your own
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="custom-sentence"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apiKey && startGame(customText)}
                maxLength={300}
                placeholder="Type any sentence (4+ words)…"
                className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted"
              />
              <button
                onClick={() => startGame(customText)}
                disabled={!apiKey || !customText.trim()}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--series-1)" }}
              >
                Build it
              </button>
            </div>
          </div>

          {!apiKey && (
            <p className="mt-3 text-xs text-ink-muted">Enter your TypeSafe API key above to play.</p>
          )}
          {error && (
            <p className="mt-3 text-xs" style={{ color: "var(--status-critical)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {phase !== "setup" && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-ink-secondary">
              Pulled <b className="tabular-nums text-ink-primary">{pulled.length}</b>
            </span>
            <span className="flex items-center gap-2 text-ink-secondary">
              Structure
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-gridline">
                <span
                  className="block h-full rounded-full transition-[width,background-color] duration-500"
                  style={{
                    width: `${Math.max(4, Math.round((collapsed ? 0 : integrity) * 100))}%`,
                    backgroundColor: collapsed ? "var(--status-critical)" : meter.color,
                  }}
                />
              </span>
              <b style={{ color: collapsed ? "var(--status-critical)" : meter.color }}>
                {collapsed ? "collapsed" : meter.text}
              </b>
              <span className="tabular-nums text-ink-muted">
                {collapsed ? "" : integrity.toFixed(2)}
              </span>
            </span>
          </div>

          <div className="relative rounded-lg border border-border-hairline bg-chart-surface p-5">
            {collapsed && (
              // The tiles have tumbled out of view; without this the panel reads as an empty void.
              <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
                the tower is gone
              </p>
            )}
            <div className={`flex flex-wrap gap-2 ${judging ? "jenga-wobble" : ""}`}>
              {words.map((word, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={`${word}-${i}`}
                    onClick={() => {
                      if (phase !== "playing") return;
                      setSelected(isSelected ? null : i);
                      setError(null);
                    }}
                    disabled={phase !== "playing"}
                    aria-pressed={isSelected}
                    className={`min-h-11 rounded-md border px-3 py-2 text-sm transition-transform ${
                      collapsed ? "jenga-collapse" : isSelected ? "-translate-y-1" : "jenga-settle"
                    }`}
                    style={{
                      borderColor: isSelected ? "var(--series-2)" : "var(--border-hairline)",
                      color: isSelected ? "var(--series-2)" : "var(--ink-primary)",
                      backgroundColor: isSelected ? "transparent" : "var(--panel, transparent)",
                      // stagger the tumble so it reads as a collapse, not a fade
                      animationDelay: collapsed ? `${i * 40}ms` : undefined,
                      ["--fall-rotate" as string]: `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 4) * 5)}deg`,
                    }}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {!collapsed && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gridline pt-4">
                {selected === null ? (
                  <p className="text-xs text-ink-muted">
                    {judging ? "Jev is checking the structure…" : "Tap a word to choose it."}
                  </p>
                ) : (
                  <>
                    <button
                      onClick={pull}
                      disabled={judging}
                      className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: "var(--series-2)" }}
                    >
                      {judging ? "Pulling…" : `Pull “${words[selected]}”`}
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      disabled={judging}
                      className="text-xs text-ink-muted underline hover:text-ink-primary disabled:opacity-50"
                    >
                      cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs" style={{ color: "var(--status-critical)" }}>
                ⚠ {error} — your run is fine, try that pull again.
              </p>
            )}

            {lastPull && !collapsed && !judging && (
              <p className="mt-3 text-xs text-ink-muted">
                Pulled &ldquo;{lastPull.word}&rdquo; — still holds at {lastPull.stability.toFixed(2)}.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border-hairline bg-chart-surface p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Original</p>
            <p className="mt-1 text-ink-secondary">{original}</p>
            {pulled.length > 0 && (
              <>
                <p className="mt-3 text-xs uppercase tracking-wide text-ink-muted">Rubble</p>
                <p className="mt-1 text-ink-secondary">{pulled.join(" · ")}</p>
              </>
            )}
          </div>

          {collapsed && collapse && (
            <div
              className="rounded-lg border p-5"
              style={{ borderColor: "var(--status-critical)" }}
            >
              <h3 className="text-base font-semibold" style={{ color: "var(--status-critical)" }}>
                It came down
              </h3>
              <p className="mt-2 text-sm text-ink-secondary">
                Pulling &ldquo;{collapse.word}&rdquo; dropped it to{" "}
                <b className="tabular-nums text-ink-primary">{collapse.stability.toFixed(2)}</b> —
                below the {COLLAPSE_THRESHOLD} line.
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                That would have left: &ldquo;{collapse.attempted}&rdquo;
              </p>
              <div className="mt-4 rounded-md border border-border-hairline p-3">
                <p className="text-xs uppercase tracking-wide text-ink-muted">Your run</p>
                <p className="mt-1 text-sm text-ink-primary">
                  <b className="tabular-nums">{pulled.length}</b> words pulled, tower stood at{" "}
                  <b className="tabular-nums">{integrity.toFixed(2)}</b>
                </p>
                <p className="mt-2 text-sm text-ink-secondary">{current}</p>
              </div>
              <button
                onClick={() => setPhase("setup")}
                className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--series-1)" }}
              >
                New tower
              </button>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => setPhase("setup")}
              disabled={judging}
              className="self-start text-xs text-ink-muted underline hover:text-ink-primary disabled:opacity-50"
            >
              start over with a different sentence
            </button>
          )}
        </>
      )}
    </div>
  );
}
