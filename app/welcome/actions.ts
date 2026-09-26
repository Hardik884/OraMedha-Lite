"use server";

import { createServerClient } from "@/lib/supabase/server";

/** The first-run guide was finished or skipped: don't show it again. */
export async function markGuideSeen(): Promise<void> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from("pg_profile")
    .update({ guide_seen_at: new Date().toISOString() })
    .eq("id", data.user.id)
    .is("guide_seen_at", null);
}
