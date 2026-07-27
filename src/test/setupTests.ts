import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Only relevant for jsdom-environment test files (opted in per-file via
// `// @vitest-environment jsdom`) — this setup file runs for every test file
// regardless of environment, so it must stay a no-op under `node`.
if (typeof window !== "undefined") {
  // jsdom doesn't implement matchMedia; motion's useReducedMotion() (used by
  // useSwipeRow, shared by TaakRij/TijdlijnTaakRij) calls it on every render
  // and throws without this polyfill. Reports "no preference" so drag/swipe
  // stays enabled in tests, matching a default desktop browser.
  window.matchMedia ??= (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList);

  // vitest's own globals aren't enabled (test.globals is off), so
  // @testing-library/react's auto-cleanup can't detect a supported test
  // framework and never unmounts between tests — do it explicitly instead,
  // or a later test's queries match leftover DOM from an earlier render.
  afterEach(() => {
    cleanup();
  });
}
