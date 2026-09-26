/**
 * Runs the database specs (test/db/**) against the LOCAL Supabase stack.
 *
 *   npm run db:start   # once
 *   npm run test:db
 *
 * The specs create throwaway users and rows, so this refuses to run against
 * anything that is not localhost — never against the hosted project. The
 * specs check again themselves (test/db/guard.ts).
 */
import { spawnSync } from "node:child_process";
import { isWindows, readLocalStack } from "./local-stack.mjs";

const stack = readLocalStack("npm run test:db");

const result = spawnSync("npx", ["vitest", "run", "--config", "vitest.db.config.ts"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    TEST_SUPABASE_URL: stack.url,
    TEST_SUPABASE_ANON_KEY: stack.anonKey,
    TEST_SUPABASE_SERVICE_ROLE_KEY: stack.serviceRoleKey,
  },
});
process.exit(result.status ?? 1);
