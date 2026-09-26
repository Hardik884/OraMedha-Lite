/**
 * Local-only guard.
 *
 * Test scripts and the local test server create throwaway users, patients and
 * appointments. Pointed at the hosted project by mistake (a stale build, a
 * wrong .env), they would write that test data into real PGs' database. So
 * each of them checks the Supabase URL with this first and refuses to run
 * unless it is the local stack.
 *
 * Plain JS-compatible module (no imports) so .mjs scripts can share the rule.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalSupabaseUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function localOnlyRefusal(what: string, url: string | undefined | null): string {
  const target = url ? new URL(url).host : "no Supabase URL";
  return (
    `${what} refused to run: it only works against the LOCAL Supabase stack ` +
    `(http://127.0.0.1:54321), but it was pointed at ${target}. ` +
    `Start the local stack with "npm run db:start" and try again. ` +
    `This guard stops test data from ever being written to the hosted project.`
  );
}
