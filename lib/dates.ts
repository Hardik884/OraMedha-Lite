/**
 * Everything in OraMedha - Resident is shown and entered in India time, whatever
 * timezone the server (Vercel runs in UTC) or the phone happens to be in.
 *
 * India has no daylight saving, so IST is always UTC+05:30 — which is what
 * lets date + time be turned into an instant with a fixed offset.
 *
 * Calendar dates are plain "YYYY-MM-DD" strings (like the database's `date`
 * type); instants are ISO strings / Date objects.
 */
export const APP_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** The calendar date in India at `instant` ("YYYY-MM-DD"). */
export function istDateOf(instant: Date | string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

/** Today's date in India. */
export function istToday(now: Date = new Date()): string {
  return istDateOf(now);
}

/** Wall-clock "HH:MM" in India at `instant`. */
export function istTimeOf(instant: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday of a calendar date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** India date + "HH:MM" → the instant, as an ISO string (UTC). */
export function istToInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00${IST_OFFSET}`).toISOString();
}

/** [start, end) of an India calendar day, as ISO instants — for range queries. */
export function istDayRange(date: string): { start: string; end: string } {
  return { start: istToInstant(date, "00:00"), end: istToInstant(addDays(date, 1), "00:00") };
}

/** "Saturday, 26 September" — the heading on the Today screen. */
export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** "9:00 AM" */
export function formatTime(instant: Date | string): string {
  const [h, m] = istTimeOf(instant).split(":").map(Number);
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

/*
 * Month and weekday names are spelled out here rather than taken from Intl:
 * ICU versions disagree ("Sep" vs "Sept"), and the server and the phone must
 * render exactly the same text or React reports a hydration mismatch.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "25 Sep" for a calendar date (or "25 Sep 2025" when not this year). */
export function formatShortDate(date: string, today: string = istToday()): string {
  const [year, month, day] = date.split("-").map(Number);
  const base = `${day} ${MONTHS[month! - 1]}`;
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${year}`;
}

/** "Today", "Tomorrow", "Yesterday" or "Tue, 29 Sep" for a calendar date. */
export function formatRelativeDay(date: string, today: string = istToday()): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return `${WEEKDAYS[isoWeekday(date) - 1]}, ${formatShortDate(date, today)}`;
}

/** "Today · 9:00 AM" / "Tue, 29 Sep · 11:00 AM" for an appointment instant. */
export function formatAppointmentWhen(instant: string, today: string = istToday()): string {
  return `${formatRelativeDay(istDateOf(instant), today)} · ${formatTime(instant)}`;
}

/** "Tue, 29 Sep" — always the actual date, for text read later (messages). */
export function formatWeekdayDate(date: string, today: string = istToday()): string {
  return `${WEEKDAYS[isoWeekday(date) - 1]}, ${formatShortDate(date, today)}`;
}
