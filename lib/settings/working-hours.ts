import { isTime } from "@/lib/dates";
import type { Session, WorkingHours } from "@/lib/scheduling/defaults";

/**
 * Clinic timings: which days the PG sees patients, and the sessions in each
 * (e.g. 09:00–13:00 and 14:00–16:00). Stored as pg_preferences.working_hours,
 * keyed by ISO weekday "1" (Mon) … "7" (Sun); a missing day is a day off.
 */
export const WEEKDAYS = [
  { day: "1", short: "Mon", long: "Monday" },
  { day: "2", short: "Tue", long: "Tuesday" },
  { day: "3", short: "Wed", long: "Wednesday" },
  { day: "4", short: "Thu", long: "Thursday" },
  { day: "5", short: "Fri", long: "Friday" },
  { day: "6", short: "Sat", long: "Saturday" },
  { day: "7", short: "Sun", long: "Sunday" },
] as const;

export const SLOT_STEPS = [5, 10, 15, 20, 30, 60] as const;
export const MAX_SESSIONS_PER_DAY = 3;

/** "09:00" → "9:00 AM", "14:30" → "2:30 PM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

/** "9:00 AM–1:00 PM" */
export function formatSession(s: Session): string {
  return `${formatClock(s.start)}–${formatClock(s.end)}`;
}

export type WorkingHoursResult =
  | { ok: true; value: WorkingHours }
  | { ok: false; errors: Partial<Record<string, string>>; formError?: string };

/**
 * Checks what the PG entered. Errors are keyed by weekday so each day's card
 * can show its own problem. Sessions come back sorted by start time.
 */
export function validateWorkingHours(input: Partial<Record<string, Session[]>>): WorkingHoursResult {
  const errors: Partial<Record<string, string>> = {};
  const value: WorkingHours = {};

  for (const { day, long } of WEEKDAYS) {
    const sessions = input[day];
    if (!sessions || sessions.length === 0) continue;

    if (sessions.length > MAX_SESSIONS_PER_DAY) {
      errors[day] = `At most ${MAX_SESSIONS_PER_DAY} sessions a day`;
      continue;
    }
    if (sessions.some((s) => !isTime(s.start) || !isTime(s.end))) {
      errors[day] = `Set a start and end time for every ${long} session`;
      continue;
    }
    if (sessions.some((s) => s.start >= s.end)) {
      errors[day] = "Each session must end after it starts";
      continue;
    }
    const sorted = [...sessions].sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.some((s, i) => i > 0 && s.start < sorted[i - 1]!.end)) {
      errors[day] = `${long}'s sessions overlap`;
      continue;
    }
    value[day] = sorted.map((s) => ({ start: s.start, end: s.end }));
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(value).length === 0) {
    return { ok: false, errors: {}, formError: "Choose at least one working day" };
  }
  return { ok: true, value };
}

/**
 * One line for the Settings list: consecutive days with identical hours are
 * grouped. "Mon–Sat · 9:00 AM–1:00 PM, 2:00 PM–4:00 PM"
 */
export function summarizeWorkingHours(wh: WorkingHours): string {
  const key = (day: string) => (wh[day] ?? []).map(formatSession).join(", ");
  const groups: { from: string; to: string; hours: string }[] = [];

  for (const { day, short } of WEEKDAYS) {
    const hours = key(day);
    if (!hours) continue;
    const last = groups[groups.length - 1];
    const previousDay = String(Number(day) - 1);
    if (last && last.hours === hours && key(previousDay) === hours) last.to = short;
    else groups.push({ from: short, to: short, hours });
  }

  if (groups.length === 0) return "No working days set";
  return groups
    .map((g) => `${g.from === g.to ? g.from : `${g.from}–${g.to}`} · ${g.hours}`)
    .join("; ");
}
