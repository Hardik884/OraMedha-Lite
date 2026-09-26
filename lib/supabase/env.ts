/**
 * Reads the public Supabase settings, failing loudly and clearly when they are
 * missing instead of letting supabase-js throw an obscure "Invalid URL" deep
 * inside a request.
 *
 * `process.env.NEXT_PUBLIC_*` must be written out in full — Next.js inlines
 * those exact expressions into the browser bundle at build time.
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

  return { url, anonKey };
}
