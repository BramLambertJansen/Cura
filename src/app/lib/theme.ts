const THEME_KEY = "cura:theme";

export type ThemePreference = "light" | "dark";

export function preferredTheme(): ThemePreference {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setThemePreference(theme: ThemePreference): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
