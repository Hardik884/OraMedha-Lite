import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Database specs — run with `npm run test:db` (see scripts/test-db.mjs), which
 * supplies the LOCAL stack's URL and keys. Serial: the specs share one database.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["test/db/**/*.spec.ts"],
    // Refuses a non-local Supabase URL before any spec runs.
    setupFiles: ["./test/db/guard.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
