import { useState } from "react";

const DARK_MODE_KEY = "cura:dark-mode";

function isDarkModeEnabled(): boolean {
  return localStorage.getItem(DARK_MODE_KEY) === "on";
}

/** Applies the persisted preference to <html>. Call once, synchronously, before the app renders. */
export function applyStoredDarkMode(): void {
  document.documentElement.classList.toggle("dark", isDarkModeEnabled());
}

/** Reads and toggles dark mode — a plain `.dark` class on <html>, persisted in localStorage. */
export function useDarkMode() {
  const [enabled, setEnabled] = useState(isDarkModeEnabled);

  function toggle() {
    const next = !enabled;
    localStorage.setItem(DARK_MODE_KEY, next ? "on" : "off");
    document.documentElement.classList.toggle("dark", next);
    setEnabled(next);
  }

  return { enabled, toggle };
}
