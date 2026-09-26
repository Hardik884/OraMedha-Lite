import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { parseWorkingHours, type WorkingHours } from "@/lib/scheduling/defaults";

/** The PG's clinic timings (empty if not set up — callers fall back gracefully). */
export async function getWorkingHours(): Promise<WorkingHours> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("pg_preferences").select("working_hours").maybeSingle();
  if (error) throw new Error(`Could not load preferences: ${error.code}`);
  return parseWorkingHours(data?.working_hours ?? null);
}
