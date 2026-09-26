/**
 * Runs before every database spec (vitest.db.config.ts → setupFiles).
 * Second line of defence behind scripts/test-db.mjs: even if a spec is run
 * directly with hand-set env vars, it refuses a non-local Supabase URL.
 */
import { isLocalSupabaseUrl, localOnlyRefusal } from "@/lib/supabase/local-guard";

const url = process.env.TEST_SUPABASE_URL;
if (!isLocalSupabaseUrl(url)) {
  throw new Error(localOnlyRefusal("The database specs", url));
}
