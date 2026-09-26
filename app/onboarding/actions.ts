"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { validateOnboarding, type OnboardingErrors } from "@/lib/onboarding/validate";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";

export type OnboardingState = {
  errors?: OnboardingErrors;
  formError?: string;
  /** Echoed back so a failed save doesn't wipe what the PG typed. */
  values?: { fullName: string; college: string; specialtyId: string };
};

/** Postgres unique_violation: the profile already exists (e.g. a double tap). */
const UNIQUE_VIOLATION = "23505";

/**
 * Saves the PG's profile and creates their default scheduling settings.
 * Safe to retry: a second submit after a flaky connection lands on Today
 * instead of failing.
 */
export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const raw = {
    fullName: formData.get("fullName"),
    college: formData.get("college"),
    specialtyId: formData.get("specialtyId"),
  };
  const result = validateOnboarding(raw);
  const values = {
    fullName: typeof raw.fullName === "string" ? raw.fullName : "",
    college: typeof raw.college === "string" ? raw.college : "",
    specialtyId: typeof raw.specialtyId === "string" ? raw.specialtyId : "",
  };
  if (!result.ok) return { errors: result.errors, values };

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(LOGIN_PATH);

  const profile = await supabase.from("pg_profile").insert({
    id: user.id,
    full_name: result.value.fullName,
    college: result.value.college,
    specialty_id: result.value.specialtyId,
  });
  if (profile.error && profile.error.code !== UNIQUE_VIOLATION) {
    console.error("Onboarding: profile insert failed", profile.error.code);
    return { formError: "Couldn't save. Check your internet and try again.", values };
  }

  // Defaults come from the table; ignore if they already exist.
  const settings = await supabase
    .from("pg_preferences")
    .upsert({ pg_id: user.id }, { onConflict: "pg_id", ignoreDuplicates: true });
  if (settings.error) {
    console.error("Onboarding: settings insert failed", settings.error.code);
    return { formError: "Couldn't save. Check your internet and try again.", values };
  }

  redirect(HOME_PATH);
}
