"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { istToday } from "@/lib/dates";
import { validateOnboarding } from "@/lib/onboarding/validate";
import { SLOT_STEPS, validateWorkingHours } from "@/lib/settings/working-hours";
import { validateBlockedTime, type BlockedInput } from "@/lib/settings/blocked";
import { validateOverride, type OverrideInput, type TemplateValues } from "@/lib/settings/overrides";
import { isReminderTiming } from "@/lib/settings/reminders";
import type { Session } from "@/lib/scheduling/defaults";

/**
 * Settings actions. Every one re-validates on the server with the same pure
 * rules the screens use, writes only the signed-in PG's own rows (Row Level
 * Security), and never trusts template values sent from the phone — it reads
 * them from the database.
 */
export type SettingsResult<K extends string = string> = {
  ok?: boolean;
  errors?: Partial<Record<K, string>>;
  formError?: string;
};

const SAVE_FAILED = "Couldn't save. Check your internet and try again.";

async function signedInUserId(): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

function failed(where: string, code: string | undefined): SettingsResult {
  console.error(`Settings: ${where} failed`, code);
  return { formError: SAVE_FAILED };
}

// ── Profile ──────────────────────────────────────────────────────────────────
export async function updateProfile(input: {
  fullName: string;
  college: string;
  specialtyId: string;
}): Promise<SettingsResult<"fullName" | "college" | "specialtyId">> {
  const result = validateOnboarding(input);
  if (!result.ok) return { errors: result.errors };

  const pgId = await signedInUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("pg_profile")
    .update({
      full_name: result.value.fullName,
      college: result.value.college,
      specialty_id: result.value.specialtyId,
    })
    .eq("id", pgId);
  if (error) return failed("profile", error.code);

  revalidatePath("/", "layout");
  redirect("/settings");
}

// ── Clinic timings ───────────────────────────────────────────────────────────
export async function updateClinicTimings(input: {
  workingHours: Partial<Record<string, Session[]>>;
  slotStepMin: number;
}): Promise<SettingsResult> {
  if (!(SLOT_STEPS as readonly number[]).includes(input.slotStepMin)) {
    return { errors: { slotStepMin: "Choose a slot length" } };
  }
  const result = validateWorkingHours(input.workingHours);
  if (!result.ok) return { errors: result.errors, formError: result.formError };

  const pgId = await signedInUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("pg_preferences")
    .upsert({ pg_id: pgId, working_hours: result.value, slot_step_min: input.slotStepMin }, { onConflict: "pg_id" });
  if (error) return failed("timings", error.code);

  revalidatePath("/settings");
  redirect("/settings");
}

// ── Blocked times ────────────────────────────────────────────────────────────
export async function addBlockedTime(input: {
  id: string;
  block: BlockedInput;
}): Promise<SettingsResult<"label" | "date" | "endDate" | "time" | "weekday">> {
  if (!isUuid(input.id)) return { formError: SAVE_FAILED };
  const result = validateBlockedTime(input.block, istToday());
  if (!result.ok) return { errors: result.errors };

  const supabase = await createServerClient();
  const { error } = await supabase.from("pg_blocked_time").insert({ id: input.id, ...result.value });
  // A retry of a save that already landed.
  if (error && error.code !== "23505") return failed("blocked time", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

export async function removeBlockedTime(id: string): Promise<SettingsResult> {
  if (!isUuid(id)) return { formError: SAVE_FAILED };
  const supabase = await createServerClient();
  // Soft delete: the row stays, marked deleted.
  const { error } = await supabase
    .from("pg_blocked_time")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return failed("remove blocked time", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

// ── My clinical defaults (stages) ────────────────────────────────────────────
async function stageTemplate(stageId: string): Promise<TemplateValues | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("stage")
    .select("default_duration_min, default_gap_min_days, default_gap_max_days")
    .eq("id", stageId)
    .maybeSingle();
  return data
    ? {
        durationMin: data.default_duration_min,
        gapMinDays: data.default_gap_min_days,
        gapMaxDays: data.default_gap_max_days,
      }
    : null;
}

export async function saveStageOverride(input: {
  stageId: string;
  values: OverrideInput;
}): Promise<SettingsResult<keyof OverrideInput>> {
  if (!isUuid(input.stageId)) return { formError: SAVE_FAILED };
  const template = await stageTemplate(input.stageId);
  if (!template) return { formError: SAVE_FAILED };

  const result = validateOverride(input.values, template, template.gapMinDays !== null);
  if (!result.ok) return { errors: result.errors };
  if (result.isReset) return resetStageOverride(input.stageId);

  const pgId = await signedInUserId();
  const supabase = await createServerClient();
  const { error } = await supabase.from("pg_stage_override").upsert(
    {
      pg_id: pgId,
      stage_id: input.stageId,
      duration_min: result.value.durationMin,
      gap_min_days: result.value.gapMinDays,
      gap_max_days: result.value.gapMaxDays,
    },
    { onConflict: "pg_id,stage_id" },
  );
  if (error) return failed("stage override", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

export async function resetStageOverride(stageId: string): Promise<SettingsResult> {
  if (!isUuid(stageId)) return { formError: SAVE_FAILED };
  const supabase = await createServerClient();
  const { error } = await supabase.from("pg_stage_override").delete().eq("stage_id", stageId);
  if (error) return failed("reset stage override", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

// ── Modifier rules ───────────────────────────────────────────────────────────
async function modifierTemplate(modifierId: string): Promise<TemplateValues | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("modifier")
    .select("override_duration_min, override_gap_min_days, override_gap_max_days")
    .eq("id", modifierId)
    .maybeSingle();
  return data
    ? {
        durationMin: data.override_duration_min,
        gapMinDays: data.override_gap_min_days,
        gapMaxDays: data.override_gap_max_days,
      }
    : null;
}

export async function saveModifierOverride(input: {
  modifierId: string;
  values: OverrideInput;
}): Promise<SettingsResult<keyof OverrideInput>> {
  if (!isUuid(input.modifierId)) return { formError: SAVE_FAILED };
  const template = await modifierTemplate(input.modifierId);
  if (!template) return { formError: SAVE_FAILED };

  const result = validateOverride(input.values, template, true);
  if (!result.ok) return { errors: result.errors };
  if (result.isReset) return resetModifierOverride(input.modifierId);

  const pgId = await signedInUserId();
  const supabase = await createServerClient();
  const { error } = await supabase.from("pg_modifier_override").upsert(
    {
      pg_id: pgId,
      modifier_id: input.modifierId,
      duration_min: result.value.durationMin,
      gap_min_days: result.value.gapMinDays,
      gap_max_days: result.value.gapMaxDays,
    },
    { onConflict: "pg_id,modifier_id" },
  );
  if (error) return failed("modifier override", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

export async function resetModifierOverride(modifierId: string): Promise<SettingsResult> {
  if (!isUuid(modifierId)) return { formError: SAVE_FAILED };
  const supabase = await createServerClient();
  const { error } = await supabase.from("pg_modifier_override").delete().eq("modifier_id", modifierId);
  if (error) return failed("reset modifier override", error.code);

  revalidatePath("/settings", "layout");
  return { ok: true };
}

// ── Reminders ────────────────────────────────────────────────────────────────
export async function updateReminderTiming(value: string): Promise<SettingsResult> {
  if (!isReminderTiming(value)) return { formError: SAVE_FAILED };
  const pgId = await signedInUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("pg_preferences")
    .upsert({ pg_id: pgId, reminder_timing: value }, { onConflict: "pg_id" });
  if (error) return failed("reminders", error.code);

  revalidatePath("/settings");
  return { ok: true };
}
