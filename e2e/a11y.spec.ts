import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// check:a11y — CLAUDE.md §6: every screen must be accessible, not as
// after-the-fact polish. Scans every screen the app is willing to land a
// fresh visitor on: the eight app-overzichten (CLAUDE.md §"Gedeelde
// overzichtsheaders") plus the two juridische pages that render outside the
// Gate. Runs against `local` data mode (see playwright.config.ts) — no
// backend, no auth, the seeded demo household (with its second demo member,
// which is why /samen is reachable here — CLAUDE.md §5 → Samen) is enough.
const APP_ROUTES = [
  "/vandaag",
  "/huis",
  "/routines",
  "/samen",
  "/meer",
  "/taken",
  "/boodschappen",
  "/focus",
];

const STANDALONE_ROUTES = ["/privacy", "/voorwaarden"];

for (const path of APP_ROUTES) {
  test(`${path} has no WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(path);
    // Every in-app route mounts inside MainShell with BottomNav visible —
    // wait for it so axe scans real content, not the loading skeleton.
    await page.getByRole("navigation").waitFor();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

for (const path of STANDALONE_ROUTES) {
  test(`${path} has no WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(path);
    // These render outside the Gate/MainShell (no BottomNav) — JuridischPage
    // guarantees an h1 as the page's first heading (CLAUDE.md doc-map).
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
