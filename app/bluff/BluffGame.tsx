"use client";

import { useEffect, useRef, useState } from "react";
import { chooseAiPlay, judgeBluff } from "./actions";
import { useApiKey } from "@/lib/api-key-context";

type Suit = "spade" | "heart" | "diamond" | "club";
interface Card {
  rank: string;
  suit: Suit;
}
interface PlayerState {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
}
interface LogEntry {
  text: string;
  tone?: "warn" | "win" | "marker";
}
interface Play {
  cards: Card[];
  claimedRank: string;
}
interface GameState {
  players: PlayerState[];
  pile: Card[];
  turnIndex: number;
  requiredRankIndex: number;
}
interface EngineCallbacks {
  appendLog: (text: string, tone?: LogEntry["tone"]) => void;
  setStatus: (id: number, text: string) => void;
  askYesNo: (body: string) => Promise<boolean>;
  onError: (msg: string) => void;
}

const SUITS: Suit[] = ["spade", "heart", "diamond", "club"];
const SUIT_SYMBOL: Record<Suit, string> = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
const RED_SUITS: Suit[] = ["heart", "diamond"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const PLURAL: Record<string, string> = {
  "2": "Twos", "3": "Threes", "4": "Fours", "5": "Fives", "6": "Sixes", "7": "Sevens",
  "8": "Eights", "9": "Nines", "10": "Tens", J: "Jacks", Q: "Queens", K: "Kings", A: "Aces",
};
const NAMES = ["You", "Rohan", "Priya", "Kabir"];
const OPPONENTS = NAMES.slice(1).map((name, i) => ({ id: i + 1, name }));

function actorLabel(p: PlayerState) {
  return p.isHuman ? "You" : p.name;
}
function actorPossessive(p: PlayerState) {
  return p.isHuman ? "Your" : `${p.name}'s`;
}
function verb(p: PlayerState, base: string) {
  return p.isHuman ? base : `${base}s`;
}

// ---- Everything below is plain, non-component game-engine code: it never runs during React's
// render pass, only from event handlers and effects, so it's free to be as impure as a card game
// actually is (shuffling, randomized AI choices, timed pacing). Keeping it out of the component
// body is also what keeps React's purity checks happy — see the callbacks it's threaded instead
// of closing over component state directly. ----

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function newDeck(): Card[] {
  const d: Card[] = [];
  SUITS.forEach((suit) => RANKS.forEach((rank) => d.push({ rank, suit })));
  return shuffle(d);
}

function dealNewGame(): GameState {
  const deck = newDeck();
  const players: PlayerState[] = NAMES.map((n, i) => ({ id: i, name: n, isHuman: i === 0, hand: [] }));
  while (deck.length) players[deck.length % 4].hand.push(deck.pop()!);
  return { players, pile: [], turnIndex: 0, requiredRankIndex: 0 };
}

async function aiChooseCards(
  apiKey: string,
  actor: PlayerState,
  claimed: string,
  onError: (msg: string) => void,
): Promise<Card[]> {
  const matching = actor.hand.filter((c) => c.rank === claimed);
  const other = actor.hand.filter((c) => c.rank !== claimed);

  let bluff: boolean;
  let count: number;
  try {
    const decision = await chooseAiPlay(apiKey, claimed, matching.length, other.length, actor.hand.length);
    bluff = decision.bluff;
    count = decision.count;
  } catch (e) {
    onError(e instanceof Error ? e.message : "The call to TypeSafe failed.");
    bluff = matching.length === 0 || (other.length > 0 && Math.random() < 0.2);
    const fallbackPool = bluff ? other : matching;
    count = Math.min(fallbackPool.length, 1 + Math.floor(Math.random() * Math.min(fallbackPool.length, 4)));
  }

  const pool = bluff ? other : matching;
  // A stale or malformed answer must never leave the player with nothing to play.
  const safePool = pool.length > 0 ? pool : matching.length > 0 ? matching : other;
  const n = Math.min(Math.max(count, 1), safePool.length, 4);
  const toPlay = shuffle(safePool).slice(0, n);
  toPlay.forEach((c) => {
    const idx = actor.hand.indexOf(c);
    actor.hand.splice(idx, 1);
  });
  return toPlay;
}

async function decideAiCall(apiKey: string, observer: PlayerState, play: Play, onError: (msg: string) => void): Promise<boolean> {
  const ownCount = observer.hand.filter((c) => c.rank === play.claimedRank).length;
  // A standard deck holds exactly 4 of any rank — if the observer's own hand plus this play
  // already exceeds that, the claim cannot possibly be true. No need to ask Jev.
  if (ownCount + play.cards.length > 4) return true;

  try {
    const { bluffProbability } = await judgeBluff(apiKey, play.claimedRank, play.cards.length, ownCount);
    return Math.random() < bluffProbability;
  } catch (e) {
    onError(e instanceof Error ? e.message : "The call to TypeSafe failed.");
    const fallback = Math.min(0.85, 0.1 + (play.cards.length - 1) * 0.08 + ownCount * 0.15);
    return Math.random() < fallback;
  }
}

async function offerBluffCall(players: PlayerState[], actor: PlayerState, play: Play, apiKey: string, cb: EngineCallbacks): Promise<PlayerState | null> {
  const order: PlayerState[] = [];
  for (let i = 1; i < players.length; i++) order.push(players[(actor.id + i) % players.length]);

  for (const p of order) {
    let willCall: boolean;
    if (p.isHuman) {
      willCall = await cb.askYesNo(
        `${actorLabel(actor)} plays ${play.cards.length} card${play.cards.length === 1 ? "" : "s"}, claiming ${PLURAL[play.claimedRank]}. Call bluff?`,
      );
    } else {
      cb.setStatus(p.id, "weighing the claim…");
      await sleep(300 + Math.random() * 300);
      willCall = await decideAiCall(apiKey, p, play, cb.onError);
      cb.setStatus(p.id, "");
      if (willCall) cb.appendLog(`${p.name} eyes the pile with suspicion…`);
    }
    if (willCall) return p;
  }
  return null;
}

function resolveBluffCall(g: GameState, caller: PlayerState, actor: PlayerState, play: Play, appendLog: EngineCallbacks["appendLog"]) {
  appendLog(`${actorLabel(caller)} ${verb(caller, "call")} bluff on ${actorLabel(actor)}!`, "warn");
  const allTrue = play.cards.every((c) => c.rank === play.claimedRank);
  const shown = play.cards.map((c) => c.rank + SUIT_SYMBOL[c.suit]).join(" ");
  if (allTrue) {
    appendLog(`The cards were ${shown} — true to the claim. ${actorLabel(caller)} ${verb(caller, "take")} the whole pile (${g.pile.length} cards).`);
    caller.hand.push(...g.pile);
  } else {
    appendLog(`The cards were ${shown} — not all ${PLURAL[play.claimedRank]}. Caught! ${actorLabel(actor)} ${verb(actor, "take")} the whole pile (${g.pile.length} cards).`, "warn");
    actor.hand.push(...g.pile);
  }
  g.pile = [];
}

async function playTurn(
  g: GameState,
  actor: PlayerState,
  apiKey: string,
  cb: EngineCallbacks,
  humanSelectCards: () => Promise<Card[]>,
): Promise<PlayerState | null> {
  const claimed = RANKS[g.requiredRankIndex];
  let cards: Card[];
  if (actor.isHuman) {
    cards = await humanSelectCards();
  } else {
    cb.setStatus(actor.id, "deciding…");
    await sleep(300 + Math.random() * 300);
    cards = await aiChooseCards(apiKey, actor, claimed, cb.onError);
    cb.setStatus(actor.id, "");
  }
  actor.hand = actor.hand.filter((c) => !cards.includes(c));
  g.pile.push(...cards);
  cb.appendLog(`${actorLabel(actor)} play${actor.isHuman ? "" : "s"} ${cards.length} card${cards.length === 1 ? "" : "s"}, claiming ${PLURAL[claimed]}.`);

  const caller = await offerBluffCall(g.players, actor, { cards, claimedRank: claimed }, apiKey, cb);
  if (caller) resolveBluffCall(g, caller, actor, { cards, claimedRank: claimed }, cb.appendLog);
  else cb.appendLog("No one calls bluff. The pile grows.");

  g.requiredRankIndex = (g.requiredRankIndex + 1) % RANKS.length;
  return actor.hand.length === 0 ? actor : null;
}

async function runLoop(
  g: GameState,
  apiKey: string,
  cb: EngineCallbacks,
  humanSelectCards: () => Promise<Card[]>,
  isCurrent: () => boolean,
  onSnapshot: () => void,
  onWin: (w: PlayerState) => void,
) {
  while (isCurrent()) {
    const actor = g.players[g.turnIndex];
    cb.appendLog(`— ${actorPossessive(actor)} turn —`, "marker");
    onSnapshot();
    const w = await playTurn(g, actor, apiKey, cb, humanSelectCards);
    if (!isCurrent()) return;
    onSnapshot();
    if (w) {
      onWin(w);
      return;
    }
    g.turnIndex = (g.turnIndex + 1) % g.players.length;
  }
}

// ---- React component ----

export default function BluffGame() {
  const { apiKey } = useApiKey();
  const gameRef = useRef<GameState | null>(null);
  const runIdRef = useRef(0);
  const humanResolveRef = useRef<((cards: Card[]) => void) | null>(null);
  const promptResolveRef = useRef<((v: boolean) => void) | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [claimedRank, setClaimedRank] = useState(RANKS[0]);
  const [pileCount, setPileCount] = useState(0);
  const [winner, setWinner] = useState<PlayerState | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Card[]>([]);
  const [prompt, setPrompt] = useState<{ body: string } | null>(null);
  const [statusById, setStatusById] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  function appendLog(text: string, tone?: LogEntry["tone"]) {
    setLog((l) => [...l, { text, tone }]);
  }

  function snapshot() {
    const g = gameRef.current;
    if (!g) return;
    setHand([...g.players[0].hand]);
    setCounts(g.players.map((p) => p.hand.length));
    setTurnIndex(g.turnIndex);
    setClaimedRank(RANKS[g.requiredRankIndex]);
    setPileCount(g.pile.length);
  }

  function humanSelectCards(): Promise<Card[]> {
    setSelected([]);
    setSelecting(true);
    return new Promise((resolve) => {
      humanResolveRef.current = (cards) => {
        setSelecting(false);
        resolve(cards);
      };
    });
  }

  function askYesNo(body: string): Promise<boolean> {
    setPrompt({ body });
    return new Promise((resolve) => {
      promptResolveRef.current = (v) => {
        setPrompt(null);
        resolve(v);
      };
    });
  }

  function startGame() {
    const runId = ++runIdRef.current;
    const g = dealNewGame();
    gameRef.current = g;
    setLog([{ text: "Thirteen cards each. The first claim is Twos — the table begins.", tone: "marker" }]);
    setWinner(null);
    setError(null);
    setStatusById({});
    setPhase("running");
    snapshot();

    const cb: EngineCallbacks = {
      appendLog,
      setStatus: (id, text) => setStatusById((s) => ({ ...s, [id]: text })),
      askYesNo,
      onError: (msg) => setError(msg),
    };
    runLoop(
      g,
      apiKey,
      cb,
      humanSelectCards,
      () => runIdRef.current === runId,
      snapshot,
      (w) => {
        setWinner(w);
        setPhase("over");
        appendLog(`${actorLabel(w)} ${w.isHuman ? "empty your hand and win" : "empties their hand and wins"} the table.`, "win");
      },
    );
  }

  function toggleCard(card: Card) {
    setSelected((sel) => {
      if (sel.includes(card)) return sel.filter((c) => c !== card);
      if (sel.length >= 4) return sel;
      return [...sel, card];
    });
  }

  function confirmPlay() {
    if (selected.length < 1) return;
    humanResolveRef.current?.(selected);
  }

  const isRed = (suit: Suit) => RED_SUITS.includes(suit);

  return (
    <div className="flex flex-col gap-5">
      {phase === "idle" && (
        <div className="rounded-lg border border-border-hairline bg-chart-surface p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Deal the table</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Thirteen cards each, dealt from a standard deck. Every hand of 1–4 cards you play
            must claim the next rank in sequence — true or not.
          </p>
          <button
            onClick={startGame}
            disabled={!apiKey}
            className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--status-critical)" }}
          >
            Deal cards
          </button>
          {!apiKey && <p className="mt-3 text-xs text-ink-muted">Enter your TypeSafe API key above to play.</p>}
        </div>
      )}

      {phase !== "idle" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {OPPONENTS.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border p-3 text-center transition-colors"
                style={{
                  borderColor: turnIndex === p.id && phase === "running" ? "var(--status-critical)" : "var(--border-hairline)",
                  backgroundColor: "var(--chart-surface)",
                }}
              >
                <p className="truncate text-sm font-semibold text-ink-primary">{p.name}</p>
                <p className="mt-1 text-xs tabular-nums text-ink-muted">{counts[p.id] ?? 0} cards</p>
                <p className="mt-1 min-h-[1em] text-[0.68rem] italic text-ink-muted">{statusById[p.id] || " "}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 rounded-lg border border-border-hairline bg-chart-surface p-4">
            <div className="flex items-center gap-1 text-xs text-ink-muted">
              <span className="tabular-nums">{pileCount}</span> in the pile
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Current claim</p>
              <p className="text-lg font-semibold" style={{ color: "var(--status-critical)" }}>
                {phase === "over" ? "—" : PLURAL[claimedRank]}
              </p>
            </div>
          </div>

          {prompt && (
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--status-critical)" }}>
              <p className="text-sm text-ink-primary">{prompt.body}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => promptResolveRef.current?.(true)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: "var(--status-critical)" }}
                >
                  Call bluff
                </button>
                <button
                  onClick={() => promptResolveRef.current?.(false)}
                  className="rounded-md border border-border-hairline px-4 py-2 text-sm text-ink-secondary hover:text-ink-primary"
                >
                  Let it lie
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border-hairline bg-chart-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-primary">Your hand</p>
              <p className="text-xs tabular-nums text-ink-muted">{hand.length} cards</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {hand.map((card, i) => {
                const isSelected = selected.includes(card);
                return (
                  <button
                    key={`${card.rank}${card.suit}-${i}`}
                    onClick={() => selecting && toggleCard(card)}
                    disabled={!selecting}
                    className={`flex h-16 w-11 flex-none flex-col justify-between rounded-md border px-1.5 py-1 font-mono text-xs font-semibold transition-transform ${
                      selecting ? "cursor-pointer" : "cursor-default opacity-90"
                    } ${isSelected ? "-translate-y-2" : ""}`}
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: isSelected ? "var(--status-critical)" : "var(--border-hairline)",
                      boxShadow: isSelected ? "0 0 0 1px var(--status-critical)" : "none",
                      color: isRed(card.suit) ? "var(--status-critical)" : "var(--ink-primary)",
                    }}
                  >
                    <span>{card.rank}{SUIT_SYMBOL[card.suit]}</span>
                    <span className="self-center text-sm">{SUIT_SYMBOL[card.suit]}</span>
                    <span className="self-end rotate-180">{card.rank}{SUIT_SYMBOL[card.suit]}</span>
                  </button>
                );
              })}
            </div>
            {selecting && (
              <div className="mt-3 flex items-center gap-3 border-t border-gridline pt-3">
                <button
                  onClick={confirmPlay}
                  disabled={selected.length < 1}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--status-critical)" }}
                >
                  Play {selected.length || ""} as {PLURAL[claimedRank]}
                </button>
                {selected.length > 0 && (
                  <button
                    onClick={() => setSelected([])}
                    className="text-xs text-ink-muted underline hover:text-ink-primary"
                  >
                    clear
                  </button>
                )}
              </div>
            )}
            {!selecting && phase === "running" && (
              <p className="mt-3 text-xs text-ink-muted">
                {turnIndex === 0 ? "Your move." : `${NAMES[turnIndex]} is deciding…`}
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--status-critical)" }}>
              ⚠ {error}
            </p>
          )}

          <div className="max-h-52 overflow-y-auto rounded-lg border border-border-hairline bg-chart-surface p-4 text-sm">
            {log.map((entry, i) => (
              <p
                key={i}
                className={
                  entry.tone === "marker"
                    ? "mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted first:mt-0"
                    : entry.tone === "win"
                      ? "font-semibold"
                      : "text-ink-secondary"
                }
                style={
                  entry.tone === "warn"
                    ? { color: "var(--status-serious)" }
                    : entry.tone === "win"
                      ? { color: "var(--status-critical)" }
                      : undefined
                }
              >
                {entry.text}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>

          {phase === "over" && winner && (
            <button
              onClick={startGame}
              className="self-start rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--status-critical)" }}
            >
              Deal again
            </button>
          )}
        </>
      )}
    </div>
  );
}
