#!/usr/bin/env node
// check:data-layer — CLAUDE.md §3/§8: "feature code never imports
// localStorage or the Supabase SDK directly", "never read raw entities in a
// feature component", and §5 → Wekker & duur op taken: "nooit de kale
// new Notification()-constructor aanroepen". First-pass regex scan, not a
// full AST — see scripts/lib/scan.mjs for the tradeoff.
import { walk, read, stripComments, importsOf, fail } from "./lib/scan.mjs";

const root = process.cwd();
const files = walk(`${root}/src`, root);
const problems = [];

// Rule 1: domain data flows through the DataStore, never raw localStorage/
// Supabase in feature code.
const DATA_LAYER_DIRS = ["src/data/local/", "src/data/cloud/", "src/stores/"];
// Named, narrow exceptions — device-local UI preference state that is
// deliberately outside the DataStore abstraction (CLAUDE.md §9: the
// useDailyLocalState/useLocalFlag primitives), plus useTaskReminders.ts's
// own hand-rolled cross-component listener for the notifications-enabled
// preference (same "device-local, not domain data" category, just not
// built on those two primitives because it needs a broadcastable snapshot).
const LOCAL_STATE_EXCEPTIONS = new Set([
  "src/app/lib/useDailyLocalState.ts",
  "src/app/lib/useLocalFlag.ts",
  "src/app/lib/useTaskReminders.ts",
]);

// Rule 2: a persisted field reaches a screen via a view-model + selector,
// never the raw src/data/schemas.ts entity.
const SCHEMA_OWNER_DIRS = ["src/data/", "src/stores/"];
const isSchemaImport = (spec) =>
  spec === "@/data/schemas" || /\/schemas(\.ts)?$/.test(spec);

// Rule 3: the bare `new Notification()` constructor is an illegal
// constructor on Android Chrome / any browser requiring an active service
// worker — every in-app OS notification goes through showLocalNotification.
const NOTIFICATION_CONSTRUCTOR_RE = /\bnew\s+Notification\s*\(/;
const NOTIFICATION_OWNER = "src/app/lib/showNotification.ts";

for (const file of files) {
  const raw = read(root, file);
  const source = stripComments(raw);

  const inDataLayerDir = DATA_LAYER_DIRS.some((d) => file.startsWith(d));
  if (!inDataLayerDir && !LOCAL_STATE_EXCEPTIONS.has(file)) {
    for (const { spec, typeOnly } of importsOf(raw)) {
      if (typeOnly) continue; // zero runtime footprint — doesn't bypass the data layer
      if (spec === "@supabase/supabase-js") {
        problems.push(
          `${file}: imports "@supabase/supabase-js" directly — only src/data/local/, src/data/cloud/, src/stores/ may do this`,
        );
      }
    }
    if (/\blocalStorage\s*\./.test(source)) {
      problems.push(
        `${file}: uses localStorage directly — only src/data/local/, src/data/cloud/, src/stores/, or the named device-local-state exceptions may do this`,
      );
    }
  }

  const inSchemaOwnerDir = SCHEMA_OWNER_DIRS.some((d) => file.startsWith(d));
  if (!inSchemaOwnerDir) {
    for (const { spec } of importsOf(raw)) {
      if (isSchemaImport(spec)) {
        problems.push(
          `${file}: imports "${spec}" — feature code reads types via src/data/types.ts / a view-model, never the raw schema`,
        );
      }
    }
  }

  if (file !== NOTIFICATION_OWNER && NOTIFICATION_CONSTRUCTOR_RE.test(source)) {
    problems.push(
      `${file}: calls the bare new Notification() constructor — use showLocalNotification (src/app/lib/showNotification.ts) instead`,
    );
  }
}

if (problems.length) {
  fail(["check:data-layer failed:", ...problems.map((p) => `  - ${p}`)]);
}

console.log(`check:data-layer: ok (${files.length} files scanned)`);
