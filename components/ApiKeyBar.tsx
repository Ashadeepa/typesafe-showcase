"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/api-key-context";
import { useCompareModel } from "@/lib/compare-key-context";
import { PROVIDER_LABEL, type CompareProvider } from "@/lib/compare-model-shared";

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;
}

function TypeSafeKeyRow() {
  const { apiKey, setApiKey } = useApiKey();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (apiKey && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
        <span>
          Using your TypeSafe key <span className="tabular-nums text-ink-muted">{maskKey(apiKey)}</span>
        </span>
        <button
          onClick={() => {
            setDraft(apiKey);
            setEditing(true);
          }}
          className="text-ink-muted underline hover:text-ink-primary"
        >
          Change
        </button>
        <button onClick={() => setApiKey("")} className="text-ink-muted underline hover:text-ink-primary">
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="whitespace-nowrap text-xs text-ink-secondary">TypeSafe key</span>
      <input
        type="password"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && draft.trim() && setApiKey(draft.trim())}
        placeholder="Paste your TYPESAFE_API_KEY…"
        className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent px-2 py-1 text-sm text-ink-primary placeholder:text-ink-muted sm:w-56 sm:flex-none"
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
      <a
        href="https://docs.typesafe.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ink-muted underline hover:text-ink-primary"
      >
        Get a key from the TypeSafe console →
      </a>
    </div>
  );
}

const PROVIDER_HELP: Record<CompareProvider, { placeholder: string; href: string; label: string }> = {
  gemini: {
    placeholder: "Paste your Gemini API key…",
    href: "https://aistudio.google.com/apikey",
    label: "Get a key from Google AI Studio →",
  },
  anthropic: {
    placeholder: "Paste your Claude API key…",
    href: "https://console.anthropic.com/settings/keys",
    label: "Get a key from the Anthropic console →",
  },
};

function CompareModelRow() {
  const { provider, setProvider, compareKey, setCompareKey } = useCompareModel();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const help = PROVIDER_HELP[provider];

  if (compareKey && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
        <span>
          Comparing against <strong className="text-ink-primary">{PROVIDER_LABEL[provider]}</strong>, key{" "}
          <span className="tabular-nums text-ink-muted">{maskKey(compareKey)}</span>
        </span>
        <button
          onClick={() => {
            setDraft(compareKey);
            setEditing(true);
          }}
          className="text-ink-muted underline hover:text-ink-primary"
        >
          Change
        </button>
        <button onClick={() => setCompareKey("")} className="text-ink-muted underline hover:text-ink-primary">
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="whitespace-nowrap text-xs text-ink-secondary">Compare with (optional)</span>
      <select
        id="compareProvider"
        value={provider}
        onChange={(e) => setProvider(e.target.value as CompareProvider)}
        className="rounded-md border border-border-hairline bg-transparent px-2 py-1 text-sm text-ink-primary"
      >
        <option value="gemini">Gemini</option>
        <option value="anthropic">Claude</option>
      </select>
      <input
        type="password"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && draft.trim() && setCompareKey(draft.trim())}
        placeholder={help.placeholder}
        className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent px-2 py-1 text-sm text-ink-primary placeholder:text-ink-muted sm:w-56 sm:flex-none"
      />
      <button
        onClick={() => draft.trim() && setCompareKey(draft.trim())}
        disabled={!draft.trim()}
        className="shrink-0 rounded-md px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--series-2)" }}
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
      <a href={help.href} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-muted underline hover:text-ink-primary">
        {help.label}
      </a>
    </div>
  );
}

export default function ApiKeyBar() {
  const { loaded: typesafeLoaded } = useApiKey();
  const { loaded: compareLoaded } = useCompareModel();
  const { apiKey } = useApiKey();

  if (!typesafeLoaded || !compareLoaded) return null;

  return (
    <div className="border-b border-border-hairline bg-chart-surface px-4 py-2.5">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {!apiKey && (
          <p className="text-xs text-ink-secondary">
            These demos run on <strong className="text-ink-primary">your</strong> API keys — stored
            only in your browser and sent with your requests, never saved on the server.
          </p>
        )}
        <TypeSafeKeyRow />
        <CompareModelRow />
      </div>
    </div>
  );
}
