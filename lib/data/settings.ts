import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { parseWorkingHours, type WorkingHours } from "@/lib/scheduling/defaults";
import { isReminderTiming, type ReminderTiming } from "@/lib/settings/reminders";
import type { OverrideValues, TemplateValues } from "@/lib/settings/overrides";

export type Preferences = {
  workingHours: WorkingHours;
  slotStepMin: number;
  reminderTiming: ReminderTiming;
};

export async function getPreferences(): Promise<Preferences> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("pg_preferences")
    .select("working_hours, slot_step_min, reminder_timing")
    .maybeSingle();
  if (error) throw new Error(`Could not load preferences: ${error.code}`);
  return {
    workingHours: parseWorkingHours(data?.working_hours ?? null),
    slotStepMin: data?.slot_step_min ?? 15,
    reminderTiming: isReminderTiming(data?.reminder_timing) ? data.reminder_timing : "evening_before",
  };
}

export type BlockedTime = {
  id: string;
  label: string;
  kind: string;
  starts_at: string | null;
  ends_at: string | null;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
};

export async function getBlockedTimes(): Promise<BlockedTime[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("pg_blocked_time")
    .select("id, label, kind, starts_at, ends_at, weekday, start_time, end_time")
    .is("deleted_at", null)
    .order("kind")
    .order("weekday")
    .order("starts_at");
  if (error) throw new Error(`Could not load blocked times: ${error.code}`);
  return data;
}

// ── My clinical defaults ─────────────────────────────────────────────────────

export type StageDefault = {
  stageId: string;
  name: string;
  template: TemplateValues;
  override: OverrideValues | null;
  /** Final stages have no "next visit" gap to change. */
  gapEditable: boolean;
};

export type CaseTypeDefaults = { caseTypeId: string; name: string; stages: StageDefault[] };

export async function getStageDefaults(specialtyId: string): Promise<CaseTypeDefaults[]> {
  const supabase = await createServerClient();
  const [caseTypes, overrides] = await Promise.all([
    supabase
      .from("case_type")
      .select(
        "id, name, stage!stage_case_type_id_fkey (id, name, sort_order, default_duration_min, default_gap_min_days, default_gap_max_days)",
      )
      .eq("specialty_id", specialtyId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("pg_stage_override").select("stage_id, duration_min, gap_min_days, gap_max_days"),
  ]);
  if (caseTypes.error) throw new Error(`Could not load templates: ${caseTypes.error.code}`);
  if (overrides.error) throw new Error(`Could not load overrides: ${overrides.error.code}`);

  const byStage = new Map(overrides.data.map((o) => [o.stage_id, o]));
  return caseTypes.data.map((ct) => ({
    caseTypeId: ct.id,
    name: ct.name,
    stages: [...ct.stage]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => {
        const o = byStage.get(s.id);
        return {
          stageId: s.id,
          name: s.name,
          template: {
            durationMin: s.default_duration_min,
            gapMinDays: s.default_gap_min_days,
            gapMaxDays: s.default_gap_max_days,
          },
          override: o
            ? { durationMin: o.duration_min, gapMinDays: o.gap_min_days, gapMaxDays: o.gap_max_days }
            : null,
          gapEditable: s.default_gap_min_days !== null,
        };
      }),
  }));
}

// ── Modifier rules ───────────────────────────────────────────────────────────

export type ModifierDefault = {
  modifierId: string;
  caseTypeName: string;
  caseTypeSortOrder: number;
  /** "<group label>: <label>", both from the template. */
  title: string;
  /** Only noted at this stage, if restricted. */
  stageName: string | null;
  /** The template's "next step becomes …", which the PG cannot change here. */
  nextStageName: string | null;
  template: TemplateValues;
  override: OverrideValues | null;
};

export async function getModifierDefaults(specialtyId: string): Promise<ModifierDefault[]> {
  const supabase = await createServerClient();
  const [modifiers, overrides] = await Promise.all([
    supabase
      .from("modifier")
      .select(
        "id, group_label, label, sort_order, override_gap_min_days, override_gap_max_days, override_duration_min, " +
          "case_type:case_type_id!inner (name, sort_order, specialty_id), " +
          "stage:stage!modifier_stage_same_case_type (name), " +
          "next:stage!modifier_next_stage_same_case_type (name)",
      )
      .eq("case_type.specialty_id", specialtyId)
      .order("sort_order"),
    supabase.from("pg_modifier_override").select("modifier_id, duration_min, gap_min_days, gap_max_days"),
  ]);
  if (modifiers.error) throw new Error(`Could not load modifiers: ${modifiers.error.code}`);
  if (overrides.error) throw new Error(`Could not load modifier overrides: ${overrides.error.code}`);

  const byModifier = new Map(overrides.data.map((o) => [o.modifier_id, o]));
  type Row = {
    id: string;
    group_label: string;
    label: string;
    override_gap_min_days: number | null;
    override_gap_max_days: number | null;
    override_duration_min: number | null;
    case_type: { name: string; sort_order: number } | null;
    stage: { name: string } | null;
    next: { name: string } | null;
  };

  return (modifiers.data as unknown as Row[])
    .filter((m) => m.case_type)
    .map((m) => {
      const o = byModifier.get(m.id);
      return {
        modifierId: m.id,
        caseTypeName: m.case_type!.name,
        caseTypeSortOrder: m.case_type!.sort_order,
        title: `${m.group_label}: ${m.label}`,
        stageName: m.stage?.name ?? null,
        nextStageName: m.next?.name ?? null,
        template: {
          durationMin: m.override_duration_min,
          gapMinDays: m.override_gap_min_days,
          gapMaxDays: m.override_gap_max_days,
        },
        override: o ? { durationMin: o.duration_min, gapMinDays: o.gap_min_days, gapMaxDays: o.gap_max_days } : null,
      };
    })
    .sort((a, b) => a.caseTypeSortOrder - b.caseTypeSortOrder);
}

export async function getSpecialties(): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("specialty")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Could not load specialties: ${error.code}`);
  return data;
}
