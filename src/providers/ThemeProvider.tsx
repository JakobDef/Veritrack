"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "veritrack:theme";

/**
 * Runs before first paint (inlined into <head> in layout.tsx) so the correct
 * theme class is on <html> before React hydrates. Without it the page flashes
 * light-then-dark on every load. Kept as a string because it must be inline.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark" ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

type ThemeContextValue = {
  /** What the user chose, including "system". */
  theme: Theme;
  /** What is actually rendered right now. */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY);
  const theme: Theme = stored === "light" || stored === "dark" ? stored : "system";

  // Only consulted while `theme` is "system"; kept in state so an OS-level
  // change re-renders.
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  const resolved: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Sync the class to the DOM, an external system: exactly what effects are for.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback(
    (next: Theme) => setStored(next === "system" ? null : next),
    [setStored],
  );

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
