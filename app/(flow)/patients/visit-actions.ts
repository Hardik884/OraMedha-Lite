"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { isIsoDate, istToday } from "@/lib/dates";
import { canRecordVisitOn } from "@/lib/visits/backdate";
import { validateNextStep, validateVisit, type NextStepFields, type VisitFields } from "@/lib/visits/validate";
import { isVisitReturn, visitUpdatedPath, wrapUpPath, type VisitReturn } from "@/lib/navigation/paths";

export type RecordVisitResult = {
  errors?: Partial<Record<"stages" | "otherWork" | "outcome" | "note" | "stage" | "date" | "time" | "durationMin", string>>;
  formError?: string;
};

const SAVE_FAILED = "Couldn't save. Check your internet and try again.";

/**
 * Saves Update Visit in ONE database call (record_visit): visit, stages done,
 * today's appointment, next appointment and the case, all or nothing.
 *
 * Retry-safe: `visitId` and `appointmentId` are made on the phone before the
 * first attempt and reused on retry, and today's visit is found by case +
 * date, so tapping Save again after a dropped connection changes nothing.
 * Editing today's visit is the same call with different answers.
 */
export async function recordVisit(input: {
  patientId: string;
  caseId: string;
  visitId: string;
  appointmentId: string;
  /** Today, or an earlier day for a forgotten update (up to 7 days back). */
  visitDate?: string;
  visit: VisitFields;
  modifierId: string | null;
  next: NextStepFields;
  /** Go back to Wrap up the day after saving, instead of "Visit updated". */
  then?: VisitReturn;
}): Promise<RecordVisitResult> {
  if (![input.patientId, input.caseId, input.visitId, input.appointmentId].every(isUuid)) {
    return { formError: SAVE_FAILED };
  }
  if (input.modifierId !== null && !isUuid(input.modifierId)) return { formError: SAVE_FAILED };
  if (input.next.kind === "stage" && !isUuid(input.next.stageId)) {
    return { errors: { stage: "Choose the next step" } };
  }
  if (!input.visit.stageIds.every(isUuid)) return { formError: SAVE_FAILED };

  const now = new Date();
  const today = istToday(now);
  const visitDate = input.visitDate ?? today;
  if (!isIsoDate(visitDate) || !canRecordVisitOn(visitDate, today)) {
    return { formError: "A visit can be recorded for today or up to 7 days back." };
  }

  const visit = validateVisit(input.visit);
  if (!visit.ok) return { errors: visit.errors };
  const next = validateNextStep(input.next, now, today);
  if (!next.ok) return { errors: next.errors };

  const supabase = await createServerClient();
  const appointment = next.value.appointment;
  const { error } = await supabase.rpc("record_visit", {
    p_case_id: input.caseId,
    p_stage_ids: visit.value.stageIds,
    p_outcome: visit.value.outcome,
    p_complete_case: next.value.kind === "complete",
    p_new_visit_id: input.visitId,
    p_other_work: visit.value.otherWork ?? undefined,
    p_modifier_id: input.modifierId ?? undefined,
    p_note: visit.value.note ?? undefined,
    p_next_stage_id: next.value.kind === "stage" ? next.value.stageId : undefined,
    p_next_appointment_id: appointment ? input.appointmentId : undefined,
    p_next_starts_at: appointment?.startsAt,
    p_next_duration_min: appointment?.durationMin,
    p_visit_date: visitDate === today ? undefined : visitDate,
  });
  if (error) {
    console.error("recordVisit failed", error.code);
    if (error.message.includes("later visit")) {
      return { formError: "A later visit is already recorded for this case, so this one can't be added now." };
    }
    return { formError: SAVE_FAILED };
  }

  if (isVisitReturn(input.then)) redirect(wrapUpPath({ saved: input.caseId }));
  redirect(visitUpdatedPath(input.patientId, input.caseId, { date: visitDate === today ? undefined : visitDate }));
}
