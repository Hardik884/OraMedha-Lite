import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { destinationAfterSignIn } from "./routes";

/**
 * Where to send a PG who has just signed in: onboarding if they have no
 * profile yet, otherwise the page they were trying to open (or Today).
 * Uses the client that just signed them in, so the new session is in hand
 * before any cookie round trip.
 */
export async function destinationFor(
  supabase: SupabaseClient<Database>,
  userId: string,
  next: string | null,
): Promise<string> {
  const { data, error } = await supabase.from("pg_profile").select("id").eq("id", userId).maybeSingle();
  // On a read error, let the app's own gate decide (it sends a PG without a
  // profile to onboarding).
  if (error) return destinationAfterSignIn(true, next);
  return destinationAfterSignIn(Boolean(data), next);
}
