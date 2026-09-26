/**
 * Guardrail on the migrations themselves (CLAUDE.md: "Every table is scoped
 * to the logged-in PG — Row Level Security on all tables"):
 *   - every table created in the public schema has RLS enabled
 *   - every view in the public schema runs with security_invoker = true
 * so a new migration can't quietly add an unprotected table or view.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIR = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
const sql = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(DIR, f), "utf8").replace(/--[^\n]*/g, ""))
  .join("\n");

describe("migrations", () => {
  it("enable Row Level Security on every public table", () => {
    const tables = [...sql.matchAll(/create table public\.([a-z_]+)/gi)].map((m) => m[1]!.toLowerCase());
    expect(tables.length).toBeGreaterThan(10);
    const withRls = new Set(
      [...sql.matchAll(/alter table public\.([a-z_]+)\s+enable row level security/gi)].map((m) => m[1]!.toLowerCase()),
    );
    expect(tables.filter((t) => !withRls.has(t))).toEqual([]);
  });

  it("create every public view with security_invoker", () => {
    const views = [...sql.matchAll(/create (?:or replace )?view public\.([a-z_]+)\s*([^;]*?)\bas\b/gi)];
    expect(views.length).toBeGreaterThan(0);
    expect(views.filter((v) => !/security_invoker\s*=\s*true/i.test(v[2]!)).map((v) => v[1])).toEqual([]);
  });
});
