import { isLocalSupabaseUrl, localOnlyRefusal } from "./local-guard";

/**
 * Reads the public Supabase settings, failing loudly and clearly when they are
 * missing instead of letting supabase-js throw an obscure "Invalid URL" deep
 * inside a request.
 *
 * `process.env.NEXT_PUBLIC_*` must be written out in full — Next.js inlines
 * those exact expressions into the browser bundle at build time.
 *
 * LOCAL-ONLY MODE: the local test server (`npm run dev:local`) sets
 * NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE=1. Then every Supabase client — server,
 * middleware and browser — refuses to start unless the URL is the local
 * stack, so a test session can never write to the hosted project.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (process.env.NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE === "1" && !isLocalSupabaseUrl(url)) {
    throw new Error(localOnlyRefusal("The local test server", url));
  }

  return { url, anonKey };
}
