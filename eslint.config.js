// ESLint flat config. Cura is a Vite app (no bundled lint like ABAS' `next
// lint`), so this is a from-scratch, deliberately lean setup: TS-recommended
// (non-type-checked — no `parserOptions.project`, keeps it fast and avoids
// tsconfig-project friction) + the two enduring, non-controversial React
// Hooks rules + jsx-a11y/recommended, matching CLAUDE.md §6's existing a11y
// requirements. `pnpm lint` runs with `--max-warnings 0` — same "a warning
// is a failure" philosophy as ABAS' `next lint --max-warnings=0`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "public/**",
      "cura-design-system-export.zip",
      "src/imports/**",
      "playwright-report/**",
      "test-results/**",
      // Vendor/tooling, not app source: installed skill packages, the
      // design-sync bridge's own stubs (see .design-sync/NOTES.md), and the
      // Deno edge functions — the last of these already sits outside
      // tsconfig.json's `include: ["src"]`, so `pnpm typecheck` doesn't
      // cover them either; keep the lint boundary the same until they get
      // their own Deno-aware tooling.
      ".agents/**",
      ".design-sync/**",
      "supabase/functions/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // `no-unused-vars`: base JS rule is off, TS-aware one takes over
      // below — but *both* still let a deliberately-unused binding be
      // named with a leading underscore (a `_row`/`_ctx` test-callback
      // param, or `({ key: _key, ...rest }) => rest` to drop one field),
      // same convention TypeScript itself recognizes.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // TypeScript (tsconfig.json: strict) already owns undefined-var
      // checking via `pnpm typecheck` — a second, non-type-aware pass here
      // would just be a less accurate duplicate.
      "no-undef": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Deliberately just these two, not eslint-plugin-react-hooks' full
      // v7 "recommended" bundle — that bundle is tuned for React Compiler
      // adoption (purity/immutability/set-state-in-render/gating/…), which
      // this codebase doesn't opt into. rules-of-hooks + exhaustive-deps
      // are the long-stable, uncontroversial pair every React project
      // relies on regardless of compiler usage.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Cura's sheets/forms deliberately autofocus their first field on
      // open (CLAUDE.md §3 → the shared Sheet's own focus handling) — the
      // WCAG concern this rule guards against (focus jumping unexpectedly
      // on *page* load) doesn't apply to a field inside a dialog the user
      // just opened by tapping "add"/"bewerken": moving focus into a
      // freshly-opened dialog is the WCAG-recommended pattern, not a
      // violation of it.
      "jsx-a11y/no-autofocus": "off",
    },
  },
  {
    // Service worker runs in ServiceWorkerGlobalScope (self, caches, …),
    // not the DOM — same reason tsconfig.worker.json type-checks it
    // separately (see CLAUDE.md §3 → App shell & PWA-platform).
    files: ["src/sw.ts"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
);
