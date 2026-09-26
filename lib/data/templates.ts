import "server-only";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Procedure templates as the New Patient / Add Case screens need them:
 * the PG's specialty's case types, each with its ordered stages and the
 * duration to pre-fill (the PG's own override if they set one, else the
 * template default).
 */
export type StageOption = {
  id: string;
  name: string;
  sortOrder: number;
  durationMin: number;
  gapMinDays: number | null;
};

export type CaseTypeOption = {
  id: string;
  name: string;
  toothRequired: boolean;
  stages: StageOption[];
};

export async function getCaseTypesForSpecialty(specialtyId: string): Promise<CaseTypeOption[]> {
  const supabase = await createServerClient();

  const [caseTypes, overrides] = await Promise.all([
    supabase
      .from("case_type")
      .select(
        "id, name, tooth_required, sort_order, stage!stage_case_type_id_fkey (id, name, sort_order, default_duration_min, default_gap_min_days)",
      )
      .eq("specialty_id", specialtyId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("pg_stage_override").select("stage_id, duration_min, gap_min_days"),
  ]);
  if (caseTypes.error) throw new Error(`Could not load case types: ${caseTypes.error.code}`);
  if (overrides.error) throw new Error(`Could not load overrides: ${overrides.error.code}`);

  const byStage = new Map(overrides.data.map((o) => [o.stage_id, o]));

  return caseTypes.data.map((ct) => ({
    id: ct.id,
    name: ct.name,
    toothRequired: ct.tooth_required,
    stages: [...ct.stage]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => {
        const o = byStage.get(s.id);
        return {
          id: s.id,
          name: s.name,
          sortOrder: s.sort_order,
          durationMin: o?.duration_min ?? s.default_duration_min,
          gapMinDays: o?.gap_min_days ?? s.default_gap_min_days,
        };
      }),
  }));
}

/**
 * A case type's stage names in template order, for one-tap file labels.
 * The current stage, when given, comes first.
 */
export async function getStageNames(caseTypeId: string, currentStageName?: string | null): Promise<string[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("stage")
    .select("name")
    .eq("case_type_id", caseTypeId)
    .order("sort_order");
  if (error) throw new Error(`Could not load stages: ${error.code}`);
  const names = data.map((s) => s.name);
  return currentStageName ? [currentStageName, ...names.filter((n) => n !== currentStageName)] : names;
}
