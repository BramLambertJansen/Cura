import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Some sandboxes have no outbound access to fetch Playwright's own pinned
// browser build, but ship a pre-installed Chromium reachable via a
// PLAYWRIGHT_BROWSERS_PATH-relative `chromium` symlink — use it when
// present (same reasoning as ABAS's playwright.config.ts), otherwise fall
// through to Playwright's default resolution (i.e. in CI, after the
// explicit `playwright install --with-deps chromium` step in
// .github/workflows/ci.yml).
const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
const sandboxChromium = browsersPath ? join(browsersPath, "chromium") : undefined;
const executablePath = sandboxChromium && existsSync(sandboxChromium) ? sandboxChromium : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
  ],
  webServer: {
    // `local` data mode needs no backend (CLAUDE.md §4) — the gate runs
    // against the seeded demo household, no Supabase project required.
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: { VITE_DATA_MODE: "local" },
  },
});
