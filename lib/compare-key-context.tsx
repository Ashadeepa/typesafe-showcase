"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CompareProvider } from "./compare-model";

const PROVIDER_STORAGE_KEY = "compare_model_provider";
const KEY_STORAGE_KEY = "compare_model_api_key";
const DEFAULT_PROVIDER: CompareProvider = "gemini";

interface CompareKeyContextValue {
  provider: CompareProvider;
  setProvider: (provider: CompareProvider) => void;
  compareKey: string;
  setCompareKey: (key: string) => void;
  loaded: boolean;
}

const CompareKeyContext = createContext<CompareKeyContextValue>({
  provider: DEFAULT_PROVIDER,
  setProvider: () => {},
  compareKey: "",
  setCompareKey: () => {},
  loaded: false,
});

/**
 * App-wide, alongside ApiKeyProvider (lib/api-key-context.tsx) — any demo can read this to run a
 * side-by-side comparison against whichever model the visitor picked, the same way every demo
 * already reads the TypeSafe key. Not specific to any one provider or demo.
 */
export function CompareKeyProvider({ children }: { children: ReactNode }) {
  const [provider, setProviderState] = useState<CompareProvider>(DEFAULT_PROVIDER);
  const [compareKey, setCompareKeyState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY);
      if (storedProvider === "gemini" || storedProvider === "anthropic") setProviderState(storedProvider);
      setCompareKeyState(localStorage.getItem(KEY_STORAGE_KEY) ?? "");
    } catch {
      // localStorage unavailable (private browsing, blocked storage) — comparison stays off.
    }
    setLoaded(true);
  }, []);

  const setProvider = (p: CompareProvider) => {
    setProviderState(p);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, p);
    } catch {
      // Ignore — the choice still works for this session via React state.
    }
  };

  const setCompareKey = (key: string) => {
    setCompareKeyState(key);
    try {
      if (key) localStorage.setItem(KEY_STORAGE_KEY, key);
      else localStorage.removeItem(KEY_STORAGE_KEY);
    } catch {
      // Ignore — the key still works for this session via React state.
    }
  };

  return (
    <CompareKeyContext.Provider value={{ provider, setProvider, compareKey, setCompareKey, loaded }}>
      {children}
    </CompareKeyContext.Provider>
  );
}

export function useCompareModel() {
  return useContext(CompareKeyContext);
}
