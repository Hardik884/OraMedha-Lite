import { isLocalSupabaseUrl } from "@/lib/supabase/local-guard";

/**
 * Local-only test sign-in.
 *
 * Google sign-in can't be automated, so the local test server offers an
 * email + password sign-in for throwaway test PGs. It exists ONLY when all of
 * these hold, and is refused (404) everywhere else:
 *  - the app runs as the local test server (`npm run dev:local` sets
 *    NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE=1),
 *  - the Supabase URL is the local stack (http://localhost / 127.0.0.1),
 *  - it is not a production build.
 * The hosted project's URL is https and never local, so this can't be turned
 * on against it, whatever the environment says.
 */
export function isTestSignInEnabled(env: {
  requireLocal: string | undefined;
  supabaseUrl: string | undefined;
  nodeEnv: string | undefined;
}): boolean {
  return env.requireLocal === "1" && env.nodeEnv !== "production" && isLocalSupabaseUrl(env.supabaseUrl);
}

/** For this app, read from its real environment. */
export function testSignInEnabled(): boolean {
  return isTestSignInEnabled({
    requireLocal: process.env.NEXT_PUBLIC_REQUIRE_LOCAL_SUPABASE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}

/** The one password every local test PG shares. Local stack only — not a secret. */
export const TEST_PASSWORD = "local-test-only";

/** Test PGs must use the reserved .test domain, so they can never be real people. */
export function isTestEmail(value: string): boolean {
  return /^[a-z0-9._+-]{1,40}@[a-z0-9-]{1,30}\.test$/i.test(value);
}
