// Shared helpers for the check:* gate scripts. Regex-based scanning over
// TypeScript source, not a real AST — a first-pass implementation, same
// tradeoff ABAS's own scripts/lib/scan.mjs made: fast, zero new
// dependencies, catches the real-world cases the CLAUDE.md rules describe,
// but not bulletproof against adversarial formatting. Tighten with a real
// parser if a gate here ever proves too fragile in practice.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Recursively collects source file paths (relative to `root`), skipping tests. */
export function walk(dir, root, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, root, out);
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(extname(entry))) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(relative(root, full).split("\\").join("/"));
  }
  return out;
}

export function read(root, file) {
  return readFileSync(join(root, file), "utf8");
}

/** Strips block and line comments so a comment mentioning e.g. "localStorage" isn't a false positive. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const STATIC_IMPORT_RE = /\bimport\s+(type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const EXPORT_FROM_RE = /\bexport\s+(type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Returns every module specifier a file imports/re-exports, as
 * `{ spec, typeOnly }`. `typeOnly` is true only for `import type { ... }`
 * (zero runtime footprint, so the data-layer-boundary rule below doesn't
 * apply to it) — a dynamic `import()` is always runtime, never type-only.
 */
export function importsOf(source) {
  const specs = [];
  for (const re of [STATIC_IMPORT_RE, EXPORT_FROM_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source))) specs.push({ spec: m[2], typeOnly: !!m[1] });
  }
  DYNAMIC_IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = DYNAMIC_IMPORT_RE.exec(source))) specs.push({ spec: m[1], typeOnly: false });
  return specs;
}

export function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}
