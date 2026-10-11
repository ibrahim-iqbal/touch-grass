import { useState, useEffect, useCallback } from "react";
import { THEME_KEY } from "../lib/storage.js";

function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// manual light/dark toggle, persisted, respecting the system default on first
// visit — ported from the vanilla initTheme()/themeBtn handler. The data-theme
// attribute on <html> is what the CSS keys off.
export function useTheme() {
  const [override, setOverride] = useState(storedTheme); // "light" | "dark" | null

  useEffect(() => {
    const root = document.documentElement;
    if (override) root.setAttribute("data-theme", override);
    else root.removeAttribute("data-theme");
  }, [override]);

  const effective = override || (systemDark() ? "dark" : "light");

  const toggle = useCallback(() => {
    const next = effective === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setOverride(next);
  }, [effective]);

  return { theme: effective, toggle };
}
