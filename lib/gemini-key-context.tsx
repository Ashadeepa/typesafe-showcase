"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "gemini_api_key";

interface GeminiKeyContextValue {
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  loaded: boolean;
}

const GeminiKeyContext = createContext<GeminiKeyContextValue>({
  geminiKey: "",
  setGeminiKey: () => {},
  loaded: false,
});

/**
 * App-wide, alongside ApiKeyProvider (lib/api-key-context.tsx) — any demo can read this key to
 * run a side-by-side comparison against Gemini, the same way every demo already reads the
 * TypeSafe key. Bluff is the first to use it; it isn't Bluff-specific.
 */
export function GeminiKeyProvider({ children }: { children: ReactNode }) {
  const [geminiKey, setGeminiKeyState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setGeminiKeyState(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      // localStorage unavailable (private browsing, blocked storage) — comparison stays off.
    }
    setLoaded(true);
  }, []);

  const setGeminiKey = (key: string) => {
    setGeminiKeyState(key);
    try {
      if (key) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — the key still works for this session via React state.
    }
  };

  return (
    <GeminiKeyContext.Provider value={{ geminiKey, setGeminiKey, loaded }}>{children}</GeminiKeyContext.Provider>
  );
}

export function useGeminiKey() {
  return useContext(GeminiKeyContext);
}
