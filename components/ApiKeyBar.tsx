"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/api-key-context";
import { useGeminiKey } from "@/lib/gemini-key-context";

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;
}

function KeyRow({
  label,
  keyValue,
  setKeyValue,
  placeholder,
  helpHref,
  helpLabel,
  optional,
}: {
  label: string;
  keyValue: string;
  setKeyValue: (v: string) => void;
  placeholder: string;
  helpHref: string;
  helpLabel: string;
  optional?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (keyValue && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
        <span>
          Using your {label} key <span className="tabular-nums text-ink-muted">{maskKey(keyValue)}</span>
        </span>
        <button
          onClick={() => {
            setDraft(keyValue);
            setEditing(true);
          }}
          className="text-ink-muted underline hover:text-ink-primary"
        >
          Change
        </button>
        <button onClick={() => setKeyValue("")} className="text-ink-muted underline hover:text-ink-primary">
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="whitespace-nowrap text-xs text-ink-secondary">
        {label} key{optional ? " (optional)" : ""}
      </span>
      <input
        type="password"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && draft.trim() && setKeyValue(draft.trim())}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-border-hairline bg-transparent px-2 py-1 text-sm text-ink-primary placeholder:text-ink-muted sm:w-56 sm:flex-none"
      />
      <button
        onClick={() => draft.trim() && setKeyValue(draft.trim())}
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
      <a href={helpHref} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-muted underline hover:text-ink-primary">
        {helpLabel}
      </a>
    </div>
  );
}

export default function ApiKeyBar() {
  const { apiKey, setApiKey, loaded: typesafeLoaded } = useApiKey();
  const { geminiKey, setGeminiKey, loaded: geminiLoaded } = useGeminiKey();

  if (!typesafeLoaded || !geminiLoaded) return null;

  return (
    <div className="border-b border-border-hairline bg-chart-surface px-4 py-2.5">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {!apiKey && (
          <p className="text-xs text-ink-secondary">
            These demos run on <strong className="text-ink-primary">your</strong> API keys — stored
            only in your browser and sent with your requests, never saved on the server.
          </p>
        )}
        <KeyRow
          label="TypeSafe"
          keyValue={apiKey}
          setKeyValue={setApiKey}
          placeholder="Paste your TYPESAFE_API_KEY…"
          helpHref="https://docs.typesafe.ai"
          helpLabel="Get a key from the TypeSafe console →"
        />
        <KeyRow
          label="Gemini"
          keyValue={geminiKey}
          setKeyValue={setGeminiKey}
          placeholder="Paste your GEMINI_API_KEY…"
          helpHref="https://aistudio.google.com/apikey"
          helpLabel="Get a key from Google AI Studio →"
          optional
        />
      </div>
    </div>
  );
}
