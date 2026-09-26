import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import type { LogEntry, Period, ProgressCase } from "@/lib/progress/count";

/**
 * Progress and logbook data, read from the progress_case and logbook_entry
 * views (security_invoker: only the signed-in PG's own rows). The counting
 * itself is done by lib/progress/count.ts.
 */
export type ProgressCaseRow = ProgressCase & { specialtyId: string; specialtyName: string; caseTypeName: string; caseTypeSort: number };

export async function getProgressCases(): Promise<ProgressCaseRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("progress_case").select("*");
  if (error) throw new Error(`Could not load cases: ${error.code}`);
  return data.flatMap((c) =>
    c.case_id && c.case_type_id && c.specialty_id
      ? [
          {
            caseId: c.case_id,
            caseTypeId: c.case_type_id,
            status: c.status === "completed" ? ("completed" as const) : ("ongoing" as const),
            completedOn: c.completed_on,
            isSpecial: !!c.is_special,
            deleted: false, // the view leaves deleted cases out
            specialtyId: c.specialty_id,
            specialtyName: c.specialty_name ?? "",
            caseTypeName: c.case_type_name ?? "",
            caseTypeSort: c.case_type_sort ?? 0,
          },
        ]
      : [],
  );
}

/** Logbook entries, narrowed in the query by period and specialty / case type. */
export async function getLogEntries(filter: {
  period: Period;
  specialtyId?: string | null;
  caseTypeId?: string | null;
  limit?: number;
}): Promise<LogEntry[]> {
  const supabase = await createServerClient();
  let q = supabase.from("logbook_entry").select("*");
  if (filter.period.from) q = q.gte("visit_date", filter.period.from);
  if (filter.period.to) q = q.lte("visit_date", filter.period.to);
  if (filter.specialtyId) q = q.eq("specialty_id", filter.specialtyId);
  if (filter.caseTypeId) q = q.eq("case_type_id", filter.caseTypeId);
  q = q.order("visit_date", { ascending: false }).order("visit_created_at", { ascending: false });
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Could not load the logbook: ${error.code}`);
  return data.flatMap((e) =>
    e.visit_id && e.visit_date && e.patient_id && e.case_id && e.case_type_id && e.stage_id
      ? [
          {
            visitId: e.visit_id,
            visitDate: e.visit_date,
            createdAt: e.visit_created_at ?? "",
            patientId: e.patient_id,
            patientName: e.patient_name ?? "",
            opdNumber: e.opd_number,
            caseId: e.case_id,
            caseTypeId: e.case_type_id,
            caseTypeName: e.case_type_name ?? "",
            tooth: e.tooth,
            stageId: e.stage_id,
            stageName: e.stage_name ?? "",
            stageOrder: e.stage_sort ?? 0,
            outcome: e.outcome === "complete" || e.outcome === "partial" ? e.outcome : null,
            isSpecial: !!e.is_special,
            deleted: false,
          },
        ]
      : [],
  );
}

export type CaseTypeInfo = { id: string; name: string; sortOrder: number; specialtyId: string };
export type SpecialtyInfo = { id: string; name: string };

/** Specialties and their active case types (template data). */
export async function getSpecialtiesAndCaseTypes(): Promise<{ specialties: SpecialtyInfo[]; caseTypes: CaseTypeInfo[] }> {
  const supabase = await createServerClient();
  const [sp, ct] = await Promise.all([
    supabase.from("specialty").select("id, name, sort_order").order("sort_order"),
    supabase.from("case_type").select("id, name, sort_order, specialty_id").eq("is_active", true).order("sort_order"),
  ]);
  if (sp.error) throw new Error(`Could not load specialties: ${sp.error.code}`);
  if (ct.error) throw new Error(`Could not load case types: ${ct.error.code}`);
  return {
    specialties: sp.data.map((s) => ({ id: s.id, name: s.name })),
    caseTypes: ct.data.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sort_order, specialtyId: c.specialty_id })),
  };
}

export async function getTargets(): Promise<Record<string, number>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("pg_case_type_target").select("case_type_id, target");
  if (error) throw new Error(`Could not load targets: ${error.code}`);
  return Object.fromEntries(data.map((t) => [t.case_type_id, t.target]));
}
