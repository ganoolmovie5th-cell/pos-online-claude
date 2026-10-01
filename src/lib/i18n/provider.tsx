"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { dict, type Locale, type TranslationKey } from "./dictionary";

type Theme = "light" | "dark";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Values are hydrated by the inline <head> script (see layout) so the
  // initial render matches what the browser already painted.
  const [locale, setLocaleState] = useState<Locale>("id");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const l = (document.documentElement.lang as Locale) || "id";
    setLocaleState(l === "en" ? "en" : "id");
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const t = useCallback(
    (key: TranslationKey) => dict[locale][key] ?? dict.id[key] ?? key,
    [locale]
  );

  return (
    <AppContext.Provider
      value={{ locale, setLocale, t, theme, setTheme, toggleTheme }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
