/**
 * Runs the database specs (test/db/**) against the LOCAL Supabase stack.
 *
 *   npm run db:start   # once
 *   npm run test:db
 *
 * The specs create throwaway users and rows, so this refuses to run against
 * anything that is not localhost — never against the hosted project.
 */
import { execFileSync, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

let statusEnv;
try {
  statusEnv = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    shell: isWindows,
  });
} catch {
  console.error("Local Supabase is not running. Start it with: npm run db:start");
  process.exit(1);
}

const vars = Object.fromEntries(
  statusEnv
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const url = vars.API_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) {
  console.error(`Refusing to run database specs against ${url ?? "an unknown URL"} (local only).`);
  process.exit(1);
}

const result = spawnSync("npx", ["vitest", "run", "--config", "vitest.db.config.ts"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    TEST_SUPABASE_URL: url,
    TEST_SUPABASE_ANON_KEY: vars.ANON_KEY,
    TEST_SUPABASE_SERVICE_ROLE_KEY: vars.SERVICE_ROLE_KEY,
  },
});
process.exit(result.status ?? 1);
