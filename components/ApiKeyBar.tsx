"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/api-key-context";

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;
}

export default function ApiKeyBar() {
  const { apiKey, setApiKey, loaded } = useApiKey();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (!loaded) return null;

  if (apiKey && !editing) {
    return (
      <div className="border-b border-border-hairline bg-chart-surface px-4 py-2 text-xs text-ink-secondary">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <span>
            Using your TypeSafe key <span className="tabular-nums text-ink-muted">{maskKey(apiKey)}</span>
          </span>
          <button
            onClick={() => {
              setDraft(apiKey);
              setEditing(true);
            }}
            className="ml-auto text-ink-muted underline hover:text-ink-primary"
          >
            Change
          </button>
          <button onClick={() => setApiKey("")} className="text-ink-muted underline hover:text-ink-primary">
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border-hairline bg-chart-surface px-4 py-3">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
        <span className="text-xs text-ink-secondary">
          These demos run on <strong className="text-ink-primary">your</strong> TypeSafe key — it's
          stored only in your browser and sent with your requests, never saved on the server.
        </span>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && setApiKey(draft.trim())}
            placeholder="Paste your TYPESAFE_API_KEY…"
            className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent px-2 py-1 text-sm text-ink-primary placeholder:text-ink-muted"
          />
          <button
            onClick={() => draft.trim() && setApiKey(draft.trim())}
            disabled={!draft.trim()}
            className="shrink-0 rounded-md px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--series-1)" }}
          >
            Save
          </button>
          {editing && (
            <button
              onClick={() => setEditing(false)}
              className="shrink-0 rounded-md border border-border-hairline px-3 py-1 text-sm text-ink-secondary"
            >
              Cancel
            </button>
          )}
        </div>
        <a
          href="https://docs.typesafe.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ink-muted underline hover:text-ink-primary"
        >
          Get a key from the TypeSafe console →
        </a>
      </div>
    </div>
  );
}
