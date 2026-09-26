import { addDays, istDateOf, istTimeOf, istToInstant, istToday } from "@/lib/dates";
import type { ReminderTiming } from "@/lib/settings/reminders";
import type { AppointmentStatus } from "./status";

/**
 * What the statuses mean while messages are sent by hand:
 *   Scheduled   — booked; the patient hasn't replied yet
 *   Confirmed   — the PG marked it after the patient replied
 *   Unconfirmed — still not confirmed by the time a reminder is due
 *                 (7 PM the evening before, or 2 hours before, per the PG's
 *                 reminder preference). Worked out, not stored, so it's never
 *                 stale and needs no background job.
 *   Missed / Cancelled / Completed — what the PG recorded
 */
export const LIVE_STATUSES = ["scheduled", "confirmed", "unconfirmed"] as const;

export function isLive(status: string): boolean {
  return (LIVE_STATUSES as readonly string[]).includes(status);
}

/** The evening reminder list shows from this time the day before (IST). */
export const EVENING_REMINDERS_FROM = "16:00";
/** A booked appointment not confirmed by this time the evening before is Unconfirmed. */
export const EVENING_CUTOFF = "19:00";
/** The "2 hours before" nudge shows from this long before the start. */
const SOON_WINDOW_MS = 3 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function unconfirmedFrom(startsAt: string, timing: ReminderTiming): Date {
  if (timing === "two_hours_before") return new Date(Date.parse(startsAt) - TWO_HOURS_MS);
  return new Date(istToInstant(addDays(istDateOf(startsAt), -1), EVENING_CUTOFF));
}

export function effectiveStatus(
  appt: { status: AppointmentStatus; startsAt: string },
  timing: ReminderTiming,
  now: Date,
): AppointmentStatus {
  if (appt.status !== "scheduled") return appt.status;
  return now >= unconfirmedFrom(appt.startsAt, timing) ? "unconfirmed" : "scheduled";
}

/** Which reminder, if any, the PG should send now: the evening one or the "starting soon" one. */
export function reminderDue(
  appt: { status: string; startsAt: string },
  timing: ReminderTiming,
  now: Date,
): "evening" | "soon" | null {
  if (!isLive(appt.status)) return null;
  const start = Date.parse(appt.startsAt);
  if (timing !== "evening_before") {
    const left = start - now.getTime();
    if (left > 0 && left <= SOON_WINDOW_MS) return "soon";
  }
  if (timing !== "two_hours_before") {
    const today = istToday(now);
    if (istDateOf(appt.startsAt) === addDays(today, 1) && istTimeOf(now) >= EVENING_REMINDERS_FROM) return "evening";
  }
  return null;
}
