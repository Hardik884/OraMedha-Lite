import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { isCaseStatus, type CaseStatus } from "@/lib/cases/status";
import type { AppointmentStatus } from "@/lib/appointments/status";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/status";
import type { TimelineVisit, VisitOutcome } from "@/lib/cases/timeline";
import type { Database } from "@/types/database.types";

type CaseOverviewRow = Database["public"]["Views"]["case_overview"]["Row"];

/**
 * A live case with everything the Today / Pending / Patient screens show.
 * Built from the `case_overview` view (Row Level Security applies to it).
 */
export type CaseSummary = {
  caseId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientOpdNumber: string | null;
  tooth: string | null;
  status: CaseStatus;
  /** Flagged by the PG as a special case (counted separately on Progress). */
  isSpecial: boolean;
  startedOn: string;
  caseTypeId: string;
  caseTypeName: string;
  currentStageId: string | null;
  currentStageName: string | null;
  nextAppointment: {
    id: string;
    startsAt: string;
    durationMin: number;
    status: AppointmentStatus;
    purpose: "treatment" | "review";
  } | null;
  /** The case's most recent appointment, whatever happened to it. */
  lastAppointment: { id: string; startsAt: string; status: AppointmentStatus } | null;
};

/** View columns are typed nullable; these ones never are for a real row. */
function required<T>(value: T | null, column: string): T {
  if (value === null) throw new Error(`case_overview.${column} was unexpectedly null`);
  return value;
}

function toAppointmentStatus(value: string | null): AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as AppointmentStatus)
    : "scheduled";
}

export function toCaseSummary(row: CaseOverviewRow): CaseSummary {
  const status = required(row.status, "status");
  return {
    caseId: required(row.case_id, "case_id"),
    patientId: required(row.patient_id, "patient_id"),
    patientName: required(row.patient_name, "patient_name"),
    patientPhone: required(row.patient_phone, "patient_phone"),
    patientAge: row.patient_age,
    patientOpdNumber: row.patient_opd_number,
    tooth: row.tooth,
    status: isCaseStatus(status) ? status : "ongoing",
    isSpecial: row.is_special ?? false,
    startedOn: required(row.started_on, "started_on"),
    caseTypeId: required(row.case_type_id, "case_type_id"),
    caseTypeName: required(row.case_type_name, "case_type_name"),
    currentStageId: row.current_stage_id,
    currentStageName: row.current_stage_name,
    nextAppointment:
      row.next_appointment_id && row.next_appointment_at
        ? {
            id: row.next_appointment_id,
            startsAt: row.next_appointment_at,
            durationMin: row.next_appointment_duration_min ?? 30,
            status: toAppointmentStatus(row.next_appointment_status),
            purpose: row.next_appointment_purpose === "review" ? "review" : "treatment",
          }
        : null,
    lastAppointment:
      row.last_appointment_id && row.last_appointment_at
        ? {
            id: row.last_appointment_id,
            startsAt: row.last_appointment_at,
            status: toAppointmentStatus(row.last_appointment_status),
          }
        : null,
  };
}

/** Ongoing cases with no upcoming appointment — "needs next appointment". */
export async function getCasesNeedingAppointment(): Promise<CaseSummary[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("case_overview")
    .select("*")
    .eq("status", "ongoing")
    .is("next_appointment_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load pending cases: ${error.code}`);
  return data.map(toCaseSummary);
}

/** Every live case of one patient, ongoing first, newest first. */
export async function getCasesForPatient(patientId: string): Promise<CaseSummary[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("case_overview")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load cases: ${error.code}`);
  const cases = data.map(toCaseSummary);
  return [...cases].sort((a, b) => Number(b.status === "ongoing") - Number(a.status === "ongoing"));
}

export async function getCase(caseId: string): Promise<CaseSummary | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("case_overview")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();
  if (error) throw new Error(`Could not load case: ${error.code}`);
  return data ? toCaseSummary(data) : null;
}

/** Visits of a case with the stages worked on, for the timeline. */
export async function getCaseVisits(caseId: string): Promise<TimelineVisit[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("visit")
    .select(
      "id, visit_date, outcome, other_work, visit_stage!visit_stage_visit_same_pg (outcome, stage:stage_id (name, sort_order))",
    )
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("visit_date", { ascending: false });
  if (error) throw new Error(`Could not load visits: ${error.code}`);

  const asOutcome = (o: string | null): VisitOutcome => (o === "partial" || o === "complete" ? o : null);
  return data.map((v) => ({
    id: v.id,
    visitDate: v.visit_date,
    otherWork: v.other_work,
    outcome: asOutcome(v.outcome),
    stages: v.visit_stage
      .filter((vs) => vs.stage)
      .map((vs) => ({
        name: vs.stage!.name,
        sortOrder: vs.stage!.sort_order,
        outcome: asOutcome(vs.outcome),
      })),
  }));
}
