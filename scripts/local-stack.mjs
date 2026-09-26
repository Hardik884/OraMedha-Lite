/**
 * Shared by the local-only scripts: reads the LOCAL Supabase stack's URL and
 * keys from `supabase status`, and refuses (exit 1, clear message) unless the
 * URL really is localhost.
 */
import { execFileSync } from "node:child_process";
import { isLocalSupabaseUrl, localOnlyRefusal } from "../lib/supabase/local-guard.ts";

export const isWindows = process.platform === "win32";

export function readLocalStack(what) {
  let statusEnv;
  try {
    statusEnv = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: isWindows,
    });
  } catch {
    console.error(`${what}: the local Supabase stack is not running. Start it with: npm run db:start`);
    process.exit(1);
  }

  const vars = Object.fromEntries(
    statusEnv
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );

  if (!isLocalSupabaseUrl(vars.API_URL)) {
    console.error(localOnlyRefusal(what, vars.API_URL));
    process.exit(1);
  }

  return { url: vars.API_URL, anonKey: vars.ANON_KEY, serviceRoleKey: vars.SERVICE_ROLE_KEY };
}
