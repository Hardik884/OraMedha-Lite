import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Import boundary for the pure engines.
 *
 * The next-step engine and the slot finder (later slices) are pure functions:
 * template + inputs in, suggestion out. They must never reach the database or
 * the network, so a Supabase or Next server import in those folders fails lint.
 */
const PURE_ENGINE_FILES = ["lib/engine/**/*.ts", "lib/scheduling/**/*.ts"];

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-local/**",
      "node_modules/**",
      "next-env.d.ts",
      // Read-only reference kit copied from the main OraMedha app.
      "docs/**",
      "public/sw.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: PURE_ENGINE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/lib/supabase", "@/lib/supabase/**", "next/*"],
              message:
                "Pure engines must not touch the database or Next.js. Data is passed in by the caller.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Leading underscore means "part of the signature, deliberately unused".
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Health data: nothing about a patient may reach the console. Warnings
      // and errors are allowed for operational failures only.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Build/CLI scripts print progress; they never touch patient data.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
];

export default eslintConfig;
