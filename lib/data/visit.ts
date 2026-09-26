import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { istDayRange, istToday } from "@/lib/dates";
import type { LastUpdatedVisit } from "@/lib/scheduling/window";
import { getCase, type CaseSummary } from "@/lib/data/cases";
import type {
  CaseTypeTemplate,
  Outcome,
  PgModifierOverride,
  PgStageOverride,
} from "@/lib/engine/next-step";

/**
 * Everything Update Visit needs for one case, loaded on the server and handed
 * to the (pure) engine on the phone: the case type's template, the PG's
 * overrides, and today's visit if there already is one. (Clinic timings and
 * appointments for the slot finder come from lib/data/scheduling.)
 */
export type TodayVisit = {
  id: string;
  /** NULL = saved "In progress" (e.g. by New Patient), not updated yet. */
  outcome: Outcome | null;
  stageIds: string[];
  otherWork: string | null;
  modifierId: string | null;
  note: string | null;
  nextStageId: string | null;
  completedAppointment: { id: string; startsAt: string } | null;
  nextAppointment: { id: string; startsAt: string; durationMin: number; status: string; purpose: string } | null;
};

export type VisitContext = {
  kase: CaseSummary;
  template: CaseTypeTemplate;
  overrides: { stages: PgStageOverride[]; modifiers: PgModifierOverride[] };
  todayVisit: TodayVisit | null;
  /** A live appointment for this case today (not yet linked to a visit). */
  todaysAppointment: { id: string; startsAt: string } | null;
  /** The case's next live appointment on a LATER day — Next Step moves it rather than adding another. */
  upcomingAppointment: { id: string; startsAt: string } | null;
  today: string;
  /** The day being recorded: today, or an earlier day for a forgotten update. */
  visitDate: string;
  /** A visit recorded on a later day than `visitDate` (then this one can't be recorded). */
  hasLaterVisit: boolean;
};

/**
 * `visitDate` defaults to today. For an earlier day (a forgotten update),
 * "today's visit" and "today's appointment" mean that day's.
 */
export async function getVisitContext(caseId: string, visitDate?: string): Promise<VisitContext | null> {
  const kase = await getCase(caseId);
  if (!kase) return null;

  const supabase = await createServerClient();
  const today = istToday();
  const day = visitDate ?? today;
  const { start, end } = istDayRange(day);
  const upcomingFrom = new Date(Math.max(Date.parse(end), Date.now())).toISOString();

  const [stages, modifiers, stageOv, modOv, visit, todayAppts, upcoming, later] = await Promise.all([
    supabase
      .from("stage")
      .select(
        "id, name, sort_order, default_duration_min, default_gap_min_days, default_gap_max_days, partial_gap_min_days, partial_gap_max_days, next_stage_on_complete_id, next_stage_on_partial_id",
      )
      .eq("case_type_id", kase.caseTypeId)
      .order("sort_order"),
    supabase
      .from("modifier")
      .select("id, group_label, label, stage_id, override_gap_min_days, override_gap_max_days, override_next_stage_id, override_duration_min, sort_order")
      .eq("case_type_id", kase.caseTypeId)
      .order("sort_order"),
    supabase
      .from("pg_stage_override")
      .select("stage_id, duration_min, gap_min_days, gap_max_days, partial_gap_min_days, partial_gap_max_days"),
    supabase.from("pg_modifier_override").select("modifier_id, duration_min, gap_min_days, gap_max_days"),
    supabase
      .from("visit")
      .select(
        "id, outcome, other_work, modifier_id, note, next_stage_id, " +
          "completed:appointment!visit_appointment_same_pg (id, starts_at), " +
          "next:appointment!visit_next_appointment_same_pg (id, starts_at, duration_min, status, purpose), " +
          "visit_stage!visit_stage_visit_same_pg (stage_id)",
      )
      .eq("case_id", caseId)
      .eq("visit_date", day)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("appointment")
      .select("id, starts_at")
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "confirmed", "unconfirmed"])
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at")
      .limit(1),
    supabase
      .from("appointment")
      .select("id, starts_at")
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .in("status", ["scheduled", "confirmed", "unconfirmed"])
      .gte("starts_at", upcomingFrom)
      .order("starts_at")
      .limit(1),
    supabase
      .from("visit")
      .select("id")
      .eq("case_id", caseId)
      .gt("visit_date", day)
      .is("deleted_at", null)
      .limit(1),
  ]);

  for (const r of [stages, modifiers, stageOv, modOv, visit, todayAppts, upcoming, later]) {
    if (r.error) throw new Error(`Could not load visit context: ${r.error.code}`);
  }

  type VisitRow = {
    id: string;
    outcome: string | null;
    other_work: string | null;
    modifier_id: string | null;
    note: string | null;
    next_stage_id: string | null;
    completed: { id: string; starts_at: string } | null;
    next: { id: string; starts_at: string; duration_min: number; status: string; purpose: string } | null;
    visit_stage: { stage_id: string }[];
  };
  const v = visit.data as unknown as VisitRow | null;

  return {
    kase,
    template: {
      name: kase.caseTypeName,
      stages: stages.data!.map((s) => ({
        id: s.id,
        name: s.name,
        sortOrder: s.sort_order,
        durationMin: s.default_duration_min,
        gapMinDays: s.default_gap_min_days,
        gapMaxDays: s.default_gap_max_days,
        partialGapMinDays: s.partial_gap_min_days,
        partialGapMaxDays: s.partial_gap_max_days,
        nextOnCompleteId: s.next_stage_on_complete_id,
        nextOnPartialId: s.next_stage_on_partial_id,
      })),
      modifiers: modifiers.data!.map((m) => ({
        id: m.id,
        label: `${m.group_label}: ${m.label}`,
        stageId: m.stage_id,
        gapMinDays: m.override_gap_min_days,
        gapMaxDays: m.override_gap_max_days,
        nextStageId: m.override_next_stage_id,
        durationMin: m.override_duration_min,
      })),
    },
    overrides: {
      stages: stageOv.data!.map((o) => ({
        stageId: o.stage_id,
        durationMin: o.duration_min,
        gapMinDays: o.gap_min_days,
        gapMaxDays: o.gap_max_days,
        partialGapMinDays: o.partial_gap_min_days,
        partialGapMaxDays: o.partial_gap_max_days,
      })),
      modifiers: modOv.data!.map((o) => ({
        modifierId: o.modifier_id,
        durationMin: o.duration_min,
        gapMinDays: o.gap_min_days,
        gapMaxDays: o.gap_max_days,
      })),
    },
    todayVisit: v
      ? {
          id: v.id,
          outcome: v.outcome === "partial" || v.outcome === "complete" ? v.outcome : null,
          stageIds: v.visit_stage.map((vs) => vs.stage_id),
          otherWork: v.other_work,
          modifierId: v.modifier_id,
          note: v.note,
          nextStageId: v.next_stage_id,
          completedAppointment: v.completed ? { id: v.completed.id, startsAt: v.completed.starts_at } : null,
          nextAppointment: v.next
            ? {
                id: v.next.id,
                startsAt: v.next.starts_at,
                durationMin: v.next.duration_min,
                status: v.next.status,
                purpose: v.next.purpose,
              }
            : null,
        }
      : null,
    todaysAppointment: todayAppts.data![0]
      ? { id: todayAppts.data![0].id, startsAt: todayAppts.data![0].starts_at }
      : null,
    upcomingAppointment: upcoming.data![0] ? { id: upcoming.data![0].id, startsAt: upcoming.data![0].starts_at } : null,
    today,
    visitDate: day,
    hasLaterVisit: (later.data?.length ?? 0) > 0,
  };
}

/**
 * The most recent visit of a case that has been UPDATED (has an outcome), for
 * working out when the next visit is due (lib/scheduling/window).
 */
export async function getLastUpdatedVisit(caseId: string): Promise<LastUpdatedVisit | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("visit")
    .select("visit_date, outcome, other_work, modifier_id, visit_stage!visit_stage_visit_same_pg (stage_id)")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .not("outcome", "is", null)
    .order("visit_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load last visit: ${error.code}`);
  if (!data || (data.outcome !== "partial" && data.outcome !== "complete")) return null;
  return {
    visitDate: data.visit_date,
    outcome: data.outcome,
    otherWork: data.other_work,
    modifierId: data.modifier_id,
    stageIds: data.visit_stage.map((vs) => vs.stage_id),
  };
}
