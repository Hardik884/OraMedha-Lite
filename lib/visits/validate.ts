import { validateAppointment } from "@/lib/appointments/validate";

/**
 * Update Visit, step 1: what was done today.
 * At least one template stage, or "Other" with a short description; and
 * Partial / Complete.
 */
export type VisitFields = {
  stageIds: string[];
  otherSelected: boolean;
  otherWork: string;
  outcome: string | null;
  note: string;
};

export type VisitValue = {
  stageIds: string[];
  otherWork: string | null;
  outcome: "partial" | "complete";
  note: string | null;
};

type VisitField = "stages" | "otherWork" | "outcome" | "note";

export function validateVisit(
  raw: VisitFields,
): { ok: true; value: VisitValue } | { ok: false; errors: Partial<Record<VisitField, string>> } {
  const errors: Partial<Record<VisitField, string>> = {};
  const stageIds = [...new Set(raw.stageIds)];
  const otherWork = raw.otherSelected ? raw.otherWork.replace(/\s+/g, " ").trim() : "";

  if (stageIds.length === 0 && !raw.otherSelected) errors.stages = "Choose what you did today";
  if (raw.otherSelected && !otherWork) errors.otherWork = "Say briefly what you did";
  else if (otherWork.length > 200) errors.otherWork = "Keep it under 200 characters";

  if (raw.outcome !== "partial" && raw.outcome !== "complete") errors.outcome = "Choose Partial or Complete";

  const note = raw.note.trim();
  if (note.length > 2000) errors.note = "Keep the note under 2000 characters";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      stageIds,
      otherWork: otherWork || null,
      outcome: raw.outcome as "partial" | "complete",
      note: note || null,
    },
  };
}

/**
 * Update Visit, step 2: what happens next.
 *  - a next stage, with an appointment now or "schedule later"; or
 *  - complete the case, optionally with a review appointment.
 */
export type NextStepFields =
  | { kind: "stage"; stageId: string; schedule: "now" | "later"; date: string; time: string; durationMin: number }
  | { kind: "complete"; review: boolean; date: string; time: string; durationMin: number };

export type NextStepValue =
  | { kind: "stage"; stageId: string; appointment: { startsAt: string; durationMin: number } | null }
  | { kind: "complete"; appointment: { startsAt: string; durationMin: number } | null };

type NextField = "stage" | "date" | "time" | "durationMin";

export function validateNextStep(
  raw: NextStepFields,
  now: Date,
  today: string,
): { ok: true; value: NextStepValue } | { ok: false; errors: Partial<Record<NextField, string>> } {
  if (raw.kind === "stage" && !raw.stageId) return { ok: false, errors: { stage: "Choose the next step" } };

  const wantsAppointment = raw.kind === "stage" ? raw.schedule === "now" : raw.review;
  let appointment: { startsAt: string; durationMin: number } | null = null;
  if (wantsAppointment) {
    const result = validateAppointment(raw, now, today);
    if (!result.ok) return { ok: false, errors: result.errors };
    appointment = result.value;
  }

  return {
    ok: true,
    value: raw.kind === "stage" ? { kind: "stage", stageId: raw.stageId, appointment } : { kind: "complete", appointment },
  };
}
