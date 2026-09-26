/**
 * The slot finder.
 *
 * A PURE function — no database, no clock of its own ("now" is passed in),
 * enforced by lint. Everything is India time: calendar dates are IST dates,
 * clinic sessions and weekly blocks are IST wall-clock, and instants are
 * compared as instants (IST has no daylight saving, so a date + "HH:MM"
 * always maps to exactly one instant).
 *
 * A slot is free when it:
 *   - is on a working day, and fits ENTIRELY inside one clinic session;
 *   - starts on the PG's slot step (clock-aligned: 9:00, 9:15, …);
 *   - starts after "now";
 *   - overlaps no blocked time (one-off, multi-day, part-day or weekly);
 *   - overlaps no live appointment of this PG (cancelled ones don't count).
 *
 * Only this PG's own appointments are ever passed in (Row Level Security),
 * so two PGs never affect each other's slots.
 */
import { addDays, formatRelativeDay, isoWeekday, istTimeOf, istToInstant, istToday } from "@/lib/dates";
import type { Session, WorkingHours } from "./defaults";

// ── Inputs ───────────────────────────────────────────────────────────────────

export type BlockedPeriod =
  | { kind: "one_off"; label: string; startsAt: string; endsAt: string }
  | { kind: "weekly"; label: string; weekday: number; startTime: string; endTime: string };

export type BusyAppointment = {
  id?: string;
  startsAt: string;
  durationMin: number;
  status?: string;
  /** Shown in clash warnings (e.g. the patient's name). Never logged. */
  label?: string;
};

export type SlotFinderInput = {
  /** The usual window, as India calendar dates (inclusive). */
  window: { from: string; to: string };
  durationMin: number;
  workingHours: WorkingHours;
  slotStepMin: number;
  blocked: BlockedPeriod[];
  appointments: BusyAppointment[];
  now: Date;
  /** e.g. the appointment being moved, which must not clash with itself. */
  excludeAppointmentIds?: string[];
  /** How many alternatives to offer (default 4). */
  alternatives?: number;
  /** How far past the window to look when it is full (default 30 days). */
  searchAfterDays?: number;
};

// ── Output ───────────────────────────────────────────────────────────────────

export type Slot = { date: string; time: string; startsAt: string };

export type SlotResult =
  | { kind: "in_window"; first: Slot; alternatives: Slot[] }
  | { kind: "after_window"; message: string; first: Slot; alternatives: Slot[] }
  | { kind: "none"; message: string };

export type SlotProblem =
  | { kind: "past" }
  | { kind: "day_off"; weekday: string }
  | { kind: "outside_hours"; sessions: string }
  | { kind: "blocked"; label: string }
  | { kind: "clash"; label?: string; startsAt: string; durationMin: number };

// ── Helpers ──────────────────────────────────────────────────────────────────

const MINUTE = 60_000;
const DEFAULT_ALTERNATIVES = 4;
const MIN_ALTERNATIVES = 3;
const DEFAULT_SEARCH_AFTER_DAYS = 30;
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h! * 60 + m!;
};
const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const ms = (isoOrDate: string | Date) => new Date(isoOrDate).getTime();
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function clock12(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h = Math.floor(minutes / 60);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(minutes % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function sessionsOn(workingHours: WorkingHours, date: string): Session[] {
  return workingHours[String(isoWeekday(date))] ?? [];
}

function liveAppointments(input: Pick<SlotFinderInput, "appointments" | "excludeAppointmentIds">) {
  const excluded = new Set(input.excludeAppointmentIds ?? []);
  return input.appointments.filter((a) => a.status !== "cancelled" && !(a.id && excluded.has(a.id)));
}

type Busy = { start: number; end: number };

/** Everything that makes a time unavailable on one date, as instants. */
function busyOn(input: SlotFinderInput, date: string): Busy[] {
  const busy: Busy[] = [];
  const weekday = isoWeekday(date);
  for (const b of input.blocked) {
    if (b.kind === "weekly") {
      if (b.weekday === weekday) {
        busy.push({ start: ms(istToInstant(date, b.startTime.slice(0, 5))), end: ms(istToInstant(date, b.endTime.slice(0, 5))) });
      }
    } else {
      busy.push({ start: ms(b.startsAt), end: ms(b.endsAt) });
    }
  }
  for (const a of liveAppointments(input)) {
    const start = ms(a.startsAt);
    busy.push({ start, end: start + a.durationMin * MINUTE });
  }
  return busy;
}

/** Every free slot on one India date, in time order. */
function freeSlotsOn(input: SlotFinderInput, date: string, busy = busyOn(input, date)): Slot[] {
  const step = Math.max(1, input.slotStepMin);
  const now = ms(input.now);
  const slots: Slot[] = [];

  for (const session of sessionsOn(input.workingHours, date)) {
    const sessionStart = toMinutes(session.start);
    const sessionEnd = toMinutes(session.end);
    for (let m = Math.ceil(sessionStart / step) * step; m + input.durationMin <= sessionEnd; m += step) {
      const time = toClock(m);
      const startsAt = istToInstant(date, time);
      const start = ms(startsAt);
      const end = start + input.durationMin * MINUTE;
      if (start <= now) continue;
      if (busy.some((b) => overlaps(start, end, b.start, b.end))) continue;
      slots.push({ date, time, startsAt });
    }
  }
  return slots;
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}

/** First slot, then one per later day, then other times to reach the minimum. */
function pickSpread(byDay: Slot[][], wanted: number): { first: Slot; alternatives: Slot[] } | null {
  const days = byDay.filter((slots) => slots.length > 0);
  if (days.length === 0) return null;
  const first = days[0]![0]!;
  const alternatives: Slot[] = [];
  for (const slots of days.slice(1)) {
    if (alternatives.length >= wanted) break;
    alternatives.push(slots[0]!);
  }
  if (alternatives.length < MIN_ALTERNATIVES) {
    const taken = new Set([first, ...alternatives].map((s) => s.startsAt));
    for (const slots of days) {
      for (const s of slots) {
        if (alternatives.length >= MIN_ALTERNATIVES) break;
        if (!taken.has(s.startsAt)) {
          alternatives.push(s);
          taken.add(s.startsAt);
        }
      }
    }
  }
  return { first, alternatives };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** The first free slot in the window plus alternatives — or the nearest after it. */
export function findSlots(input: SlotFinderInput): SlotResult {
  const today = istToday(input.now);
  const wanted = Math.min(5, Math.max(MIN_ALTERNATIVES, input.alternatives ?? DEFAULT_ALTERNATIVES));
  const searchAfter = input.searchAfterDays ?? DEFAULT_SEARCH_AFTER_DAYS;

  const windowStart = input.window.from > today ? input.window.from : today;
  const inWindow = pickSpread(
    datesBetween(windowStart, input.window.to).map((d) => freeSlotsOn(input, d)),
    wanted,
  );
  if (inWindow) return { kind: "in_window", ...inWindow };

  const afterStart = input.window.to >= today ? addDays(input.window.to, 1) : today;
  const after = pickSpread(
    datesBetween(afterStart, addDays(afterStart, searchAfter - 1)).map((d) => freeSlotsOn(input, d)),
    wanted,
  );
  if (!after) {
    return { kind: "none", message: `No free slot in the next ${searchAfter} days. Pick a time yourself.` };
  }

  const { from, to } = input.window;
  const message =
    to < today
      ? `The usual window (${formatRelativeDay(from, today)} – ${formatRelativeDay(to, today)}) has passed. These are the earliest free slots.`
      : `No free slot ${from === to ? `on ${formatRelativeDay(from, today)}` : `between ${formatRelativeDay(from, today)} and ${formatRelativeDay(to, today)}`}. These are the nearest free slots after it.`;
  return { kind: "after_window", message, ...after };
}

/**
 * Free times grouped by day, for "Choose a different slot". Defaults to the
 * window; pass `range` to list other days (e.g. after a full window).
 */
export function freeSlotsByDay(
  input: SlotFinderInput,
  opts: { maxPerDay: number; range?: { from: string; to: string } },
): { date: string; slots: Slot[] }[] {
  const today = istToday(input.now);
  const range = opts.range ?? input.window;
  const from = range.from > today ? range.from : today;
  return datesBetween(from, range.to)
    .map((date) => ({ date, slots: freeSlotsOn(input, date).slice(0, opts.maxPerDay) }))
    .filter((g) => g.slots.length > 0);
}

/**
 * What is wrong with a time the PG picked by hand — empty when it's fine.
 * The PG may still book it; the screen shows these as warnings.
 */
export function checkSlot(
  input: Pick<SlotFinderInput, "workingHours" | "blocked" | "appointments" | "now" | "excludeAppointmentIds">,
  date: string,
  time: string,
  durationMin: number,
): SlotProblem[] {
  const problems: SlotProblem[] = [];
  const start = ms(istToInstant(date, time));
  const end = start + durationMin * MINUTE;

  if (start < ms(input.now)) problems.push({ kind: "past" });

  const sessions = sessionsOn(input.workingHours, date);
  if (sessions.length === 0) {
    problems.push({ kind: "day_off", weekday: WEEKDAY_NAMES[isoWeekday(date) - 1]! });
  } else {
    const startMin = toMinutes(time);
    const fits = sessions.some((s) => startMin >= toMinutes(s.start) && startMin + durationMin <= toMinutes(s.end));
    if (!fits) {
      problems.push({
        kind: "outside_hours",
        sessions: sessions.map((s) => `${clock12(s.start)}–${clock12(s.end)}`).join(", "),
      });
    }
  }

  const weekday = isoWeekday(date);
  for (const b of input.blocked) {
    const [bStart, bEnd] =
      b.kind === "weekly"
        ? b.weekday === weekday
          ? [ms(istToInstant(date, b.startTime.slice(0, 5))), ms(istToInstant(date, b.endTime.slice(0, 5)))]
          : [0, 0]
        : [ms(b.startsAt), ms(b.endsAt)];
    if (overlaps(start, end, bStart, bEnd)) problems.push({ kind: "blocked", label: b.label });
  }

  for (const a of liveAppointments(input)) {
    const aStart = ms(a.startsAt);
    if (overlaps(start, end, aStart, aStart + a.durationMin * MINUTE)) {
      problems.push({ kind: "clash", label: a.label, startsAt: a.startsAt, durationMin: a.durationMin });
    }
  }
  return problems;
}

/**
 * One plain sentence per problem. (`_today` is reserved for naming the day of
 * a clash; a clash always overlaps the picked time, so today it is the same day.)
 */
export function describeProblem(p: SlotProblem, _today: string): string {
  switch (p.kind) {
    case "past":
      return "That time has already passed";
    case "day_off":
      return `${p.weekday} isn't one of your working days`;
    case "outside_hours":
      return `Outside your clinic timings (${p.sessions})`;
    case "blocked":
      return `During your blocked time: ${p.label}`;
    case "clash":
      return `Clashes with ${p.label ?? "another appointment"} at ${clock12(istTimeOf(p.startsAt))} (${p.durationMin} min)`;
  }
}
