import { addDays, isoWeekday, isTime } from "@/lib/dates";

/**
 * Pre-filled values for the MANUAL appointment picker (Slice 2). Not the slot
 * finder (Slice 5): this doesn't look at other appointments. It only saves the
 * PG a few taps by starting on a sensible day and time, which they can change.
 *
 * Pure: no database, no clock — the caller passes "today".
 */

/** One clinic session, wall-clock India time. */
export type Session = { start: string; end: string };

/** ISO weekday ("1" = Mon … "7" = Sun) → sessions. Missing day = off. */
export type WorkingHours = Partial<Record<string, Session[]>>;

const FALLBACK_TIME = "10:00";
/** How far ahead to look for a working day before giving up. */
const LOOKAHEAD_DAYS = 14;

/**
 * Reads the pg_preferences.working_hours JSON defensively: anything that isn't
 * a well-formed session is ignored rather than crashing the screen.
 */
export function parseWorkingHours(json: unknown): WorkingHours {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const result: WorkingHours = {};
  for (const [day, sessions] of Object.entries(json as Record<string, unknown>)) {
    if (!/^[1-7]$/.test(day) || !Array.isArray(sessions)) continue;
    const valid = sessions.filter(
      (s): s is Session =>
        !!s &&
        typeof s === "object" &&
        isTime((s as Session).start) &&
        isTime((s as Session).end) &&
        (s as Session).start < (s as Session).end,
    );
    if (valid.length > 0) result[day] = [...valid].sort((a, b) => a.start.localeCompare(b.start));
  }
  return result;
}

/**
 * The first working day at least `gapMinDays` (and at least 1) days after
 * today, at the start of that day's first session.
 */
export function defaultNextVisit(input: {
  today: string;
  gapMinDays: number | null;
  workingHours: WorkingHours;
}): { date: string; time: string } {
  const first = addDays(input.today, Math.max(1, input.gapMinDays ?? 1));
  const hasWorkingDays = Object.keys(input.workingHours).length > 0;
  if (!hasWorkingDays) return { date: first, time: FALLBACK_TIME };

  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const date = addDays(first, i);
    const sessions = input.workingHours[String(isoWeekday(date))];
    if (sessions && sessions.length > 0) return { date, time: sessions[0]!.start };
  }
  return { date: first, time: FALLBACK_TIME };
}

/** Durations offered as one-tap chips, always including the stage's default. */
const COMMON_DURATIONS = [15, 30, 45, 60, 90, 120];

export function durationOptions(defaultMin: number): number[] {
  return [...new Set([...COMMON_DURATIONS, defaultMin])].sort((a, b) => a - b);
}

/**
 * "60 min", "90 min", "120 min" — PGs think of chair time in minutes — and
 * hours only for long sessions ("2 h 30 min").
 */
export function formatDuration(min: number): string {
  if (min <= 120) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
