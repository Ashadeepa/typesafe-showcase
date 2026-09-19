"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "typesafe_api_key";

interface ApiKeyContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
  loaded: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextValue>({
  apiKey: "",
  setApiKey: () => {},
  loaded: false,
});

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setApiKeyState(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      // localStorage unavailable (private browsing, blocked storage) — fall back to empty.
    }
    setLoaded(true);
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    try {
      if (key) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — the key still works for this session via React state.
    }
  };

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, loaded }}>{children}</ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  return useContext(ApiKeyContext);
}
