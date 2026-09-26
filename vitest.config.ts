import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias from tsconfig.json.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.spec.ts", "components/**/*.spec.ts", "test/**/*.spec.ts"],
    // Database specs need the local Supabase stack: `npm run test:db`.
    exclude: ["test/db/**", "node_modules/**"],
    environment: "node",
  },
});
