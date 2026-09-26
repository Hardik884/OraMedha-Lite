import { addDays, isIsoDate, istToInstant, isTime } from "@/lib/dates";

/**
 * Checks a manually picked appointment. `now` is passed in so the rule
 * "not in the past" is testable.
 */
export type AppointmentFields = { date: string; time: string; durationMin: string | number };

export type AppointmentValue = { startsAt: string; durationMin: number };

/** A little slack so booking "now" on a slow phone isn't refused. */
const PAST_GRACE_MS = 10 * 60 * 1000;
const MAX_DAYS_AHEAD = 366;

export function validateAppointment(
  raw: AppointmentFields,
  now: Date,
  today: string,
):
  | { ok: true; value: AppointmentValue }
  | { ok: false; errors: Partial<Record<"date" | "time" | "durationMin", string>> } {
  const errors: Partial<Record<"date" | "time" | "durationMin", string>> = {};

  const duration = Number(raw.durationMin);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    errors.durationMin = "Choose a duration";
  }

  if (!isIsoDate(raw.date)) errors.date = "Choose a date";
  else if (raw.date > addDays(today, MAX_DAYS_AHEAD)) errors.date = "That's more than a year away";

  if (!isTime(raw.time)) errors.time = "Choose a time";

  if (!errors.date && !errors.time) {
    const startsAt = istToInstant(raw.date, raw.time);
    if (new Date(startsAt).getTime() < now.getTime() - PAST_GRACE_MS) {
      errors[raw.date < today ? "date" : "time"] = "That time has already passed";
    }
    if (Object.keys(errors).length === 0) {
      return { ok: true, value: { startsAt, durationMin: duration } };
    }
  }

  return { ok: false, errors };
}
