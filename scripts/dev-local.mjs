/**
 * The LOCAL test server: `next dev` wired to the local Supabase stack.
 *
 *   npm run db:start
 *   npm run dev:local            # http://localhost:3100
 *   npm run dev:local -- 3200    # another port
 *
 * Safe by construction:
 *  - refuses to start unless `supabase status` reports a localhost URL;
 *  - sets NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE=1, so every Supabase client in
 *    the app refuses a non-local URL too (lib/supabase/env.ts);
 *  - builds into .next-local, so it can never reuse a bundle compiled with
 *    the hosted project's URL.
 *
 * Use plain `npm run dev` for the hosted project.
 */
import { spawn } from "node:child_process";
import { isWindows, readLocalStack } from "./local-stack.mjs";

const stack = readLocalStack("npm run dev:local");
const port = process.argv[2] ?? "3100";

console.log(`Local test server → Supabase at ${stack.url} (local only), app at http://localhost:${port}`);

const child = spawn("npx", ["next", "dev", "-p", port], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: stack.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
    NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE: "1",
    NEXT_DIST_DIR: ".next-local",
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
