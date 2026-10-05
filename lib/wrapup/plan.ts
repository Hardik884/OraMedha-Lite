import type { AppointmentStatus } from "@/lib/appointments/status";

/**
 * Wrap up the day.
 *
 * PGs rarely update anything between patients; they do it once, after
 * clinic. So the day's appointments become one list, each answered once:
 *
 *   to_update — it has started and nothing is recorded yet: "Came" / "Didn't come"
 *   later     — still to come today (can be updated early with "Came")
 *   came      — visit recorded (or marked as came)
 *   missed    — marked as didn't come
 *
 * "Came" on an ongoing case opens Update Visit (what was done, and the next
 * appointment, in one pass). On a review visit or a case without a template
 * stage to record, "Came" just marks the appointment completed.
 */
export type WrapUpState = "to_update" | "later" | "came" | "missed";
export type WrapUpAction = "update_visit" | "mark_came";

export type WrapUpAppointment = {
  id: string;
  startsAt: string;
  /** Effective status (see lib/appointments/timing). */
  status: AppointmentStatus;
  caseId: string | null;
  caseStatus: string | null;
  purpose: "treatment" | "review";
};

const LIVE: AppointmentStatus[] = ["scheduled", "confirmed", "unconfirmed"];

export function wrapUpState(a: WrapUpAppointment, now: Date): WrapUpState | null {
  if (a.status === "completed") return "came";
  if (a.status === "missed") return "missed";
  if (!LIVE.includes(a.status)) return null;
  return Date.parse(a.startsAt) <= now.getTime() ? "to_update" : "later";
}

export function wrapUpAction(a: WrapUpAppointment): WrapUpAction {
  return a.purpose === "treatment" && a.caseId !== null && a.caseStatus === "ongoing" ? "update_visit" : "mark_came";
}

const ORDER: Record<WrapUpState, number> = { to_update: 0, later: 1, came: 2, missed: 2 };

export type WrapUpItem<T extends WrapUpAppointment> = { appointment: T; state: WrapUpState; action: WrapUpAction };

/** The day's list: still to answer first (in time order), then later today, then answered. */
export function planWrapUp<T extends WrapUpAppointment>(
  appointments: T[],
  now: Date,
): { items: WrapUpItem<T>[]; toUpdate: number; later: number; done: number } {
  const items = appointments
    .flatMap((a) => {
      const state = wrapUpState(a, now);
      return state ? [{ appointment: a, state, action: wrapUpAction(a) }] : [];
    })
    .sort(
      (x, y) => ORDER[x.state] - ORDER[y.state] || x.appointment.startsAt.localeCompare(y.appointment.startsAt),
    );
  const count = (...s: WrapUpState[]) => items.filter((i) => s.includes(i.state)).length;
  return { items, toUpdate: count("to_update"), later: count("later"), done: count("came", "missed") };
}
