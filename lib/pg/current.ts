import "server-only";
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { nameFromProfile } from "@/lib/onboarding/prefill";

export type CurrentPg = {
  id: string;
  /** The Google account's email, shown in Settings. */
  email: string | null;
  fullName: string;
  college: string;
  specialty: { id: string; name: string };
  /** Finished or skipped the first-run guide. */
  guideSeen: boolean;
};

/**
 * The signed-in PG and their profile, or why there isn't one.
 * Cached per request, so a layout and a page can both ask for free.
 */
export const getCurrentPg = cache(
  async (): Promise<
    | { state: "signed-out" }
    | { state: "needs-onboarding"; userId: string; suggestedName: string }
    | { state: "ready"; pg: CurrentPg }
  > => {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { state: "signed-out" };

    const { data: profile, error } = await supabase
      .from("pg_profile")
      .select("id, full_name, college, guide_seen_at, specialty:specialty_id (id, name)")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw new Error(`Could not load PG profile: ${error.code}`);
    if (!profile || !profile.specialty) {
      return { state: "needs-onboarding", userId: user.id, suggestedName: nameFromProfile(user.user_metadata) };
    }

    return {
      state: "ready",
      pg: {
        id: profile.id,
        email: user.email ?? null,
        fullName: profile.full_name,
        college: profile.college,
        specialty: profile.specialty,
        guideSeen: profile.guide_seen_at !== null,
      },
    };
  },
);
