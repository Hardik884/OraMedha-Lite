/**
 * Guardrails for two CLAUDE.md rules, checked on every test run instead of
 * relying on someone remembering to grep:
 *
 *  1. Specialty-agnostic core — clinical words live in template DATA
 *     (supabase/seed.sql, database rows), never in app/, components/ or lib/.
 *  2. OraMedha look — components use token classes only: no raw hex/rgb
 *     colours and no Tailwind palette classes like bg-blue-600.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCANNED_DIRS = ["app", "components", "lib"];

/**
 * Files allowed to contain raw colour values, each for a stated reason.
 * Paths use forward slashes, relative to the repo root.
 */
const RAW_COLOUR_ALLOWED = new Set([
  // The design tokens themselves.
  "app/globals.css",
  // The single mirror of a few tokens for places that cannot read CSS
  // variables (manifest, theme-color). Checked against globals.css by its spec.
  "lib/theme/colors.ts",
]);

/**
 * Clinical vocabulary that must never be hard-coded. Matched as whole words,
 * case-insensitively. Extend this list as templates grow.
 */
const CLINICAL_WORDS = [
  "BMP",
  "RCT",
  "root canal",
  "obturation",
  "access opening",
  "GP removal",
  "working length",
  "pulpectomy",
  "pulpotomy",
  "apicoectomy",
  "retreatment",
  "calcium hydroxide",
  "medicament",
  "crown",
  "bridge",
  "denture",
  "impression",
  "cementation",
  "tooth preparation",
  "scaling",
  "root planing",
  "extraction",
  "implant",
  "endodontics",
  "prosthodontics",
  "periodontics",
  "orthodontics",
];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PALETTE_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|caret|placeholder|ring-offset)-(?:(?:${PALETTE})-\\d{2,3}|white|black)\\b`,
);
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry) && !/\.spec\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

const files = SCANNED_DIRS.flatMap((d) => walk(join(ROOT, d))).map((full) => ({
  path: relative(ROOT, full).split(sep).join("/"),
  source: readFileSync(full, "utf8"),
}));

/** Lines of `source` matching `pattern`, as "file:line: text". */
function offending(path: string, source: string, pattern: RegExp): string[] {
  return source
    .split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, n }) => `${path}:${n}: ${line.trim()}`);
}

describe("guardrails", () => {
  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("no clinical words are hard-coded in app/, components/ or lib/", () => {
    const pattern = new RegExp(
      `\\b(?:${CLINICAL_WORDS.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`,
      "i",
    );
    const hits = files.flatMap((f) => offending(f.path, f.source, pattern));
    expect(hits).toEqual([]);
  });

  it("no raw colour values outside the token files", () => {
    const hits = files
      .filter((f) => !RAW_COLOUR_ALLOWED.has(f.path))
      .flatMap((f) => offending(f.path, f.source, RAW_COLOUR));
    expect(hits).toEqual([]);
  });

  it("no Tailwind palette colour classes (bg-blue-600, text-white…)", () => {
    const hits = files
      .filter((f) => f.path !== "app/globals.css")
      .flatMap((f) => offending(f.path, f.source, PALETTE_CLASS));
    expect(hits).toEqual([]);
  });
});
