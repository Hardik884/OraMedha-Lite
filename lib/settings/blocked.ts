import { addDays, formatRelativeDay, isIsoDate, istDateOf, istTimeOf, istToInstant, isTime } from "@/lib/dates";
import { formatClock, WEEKDAYS } from "./working-hours";

/**
 * Blocked times — when the slot finder must not book anyone.
 *  - one-off: a day (or several) or part of a day ("exam on 3 Oct")
 *  - weekly: part of one weekday, every week ("seminar every Wed 9–11")
 * Times are India wall-clock; one-offs are stored as instants.
 */
export type BlockedInput =
  | {
      kind: "one_off";
      label: string;
      date: string;
      /** Last day, for multi-day blocks. Defaults to `date`. */
      endDate?: string;
      allDay: boolean;
      startTime?: string;
      endTime?: string;
    }
  | { kind: "weekly"; label: string; weekday: string; startTime: string; endTime: string };

export type BlockedRow =
  | { kind: "one_off"; label: string; starts_at: string; ends_at: string; weekday: null; start_time: null; end_time: null }
  | { kind: "weekly"; label: string; starts_at: null; ends_at: null; weekday: number; start_time: string; end_time: string };

type Field = "label" | "date" | "endDate" | "time" | "weekday";

export function validateBlockedTime(
  input: BlockedInput,
  today: string,
): { ok: true; value: BlockedRow } | { ok: false; errors: Partial<Record<Field, string>> } {
  const errors: Partial<Record<Field, string>> = {};
  const label = input.label.replace(/\s+/g, " ").trim();
  if (!label) errors.label = "Say what it is, e.g. Exam or Seminar";
  else if (label.length > 80) errors.label = "Keep it under 80 characters";

  if (input.kind === "weekly") {
    if (!/^[1-7]$/.test(input.weekday)) errors.weekday = "Choose the day";
    if (!isTime(input.startTime) || !isTime(input.endTime)) errors.time = "Set the start and end time";
    else if (input.startTime >= input.endTime) errors.time = "End must be after start";
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    return {
      ok: true,
      value: {
        kind: "weekly",
        label,
        starts_at: null,
        ends_at: null,
        weekday: Number(input.weekday),
        start_time: input.startTime,
        end_time: input.endTime,
      },
    };
  }

  const endDate = input.endDate || input.date;
  if (!isIsoDate(input.date)) errors.date = "Choose the date";
  else if (input.date < today) errors.date = "That day has passed";
  if (!isIsoDate(endDate)) errors.endDate = "Choose the last day";
  else if (isIsoDate(input.date) && endDate < input.date) errors.endDate = "Last day can't be before the first";

  const multiDay = endDate !== input.date;
  if (!input.allDay) {
    if (multiDay) errors.time = "Several days can only be blocked as whole days";
    else if (!isTime(input.startTime ?? "") || !isTime(input.endTime ?? "")) errors.time = "Set the start and end time";
    else if (input.startTime! >= input.endTime!) errors.time = "End must be after start";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: "one_off",
      label,
      starts_at: istToInstant(input.date, input.allDay ? "00:00" : input.startTime!),
      ends_at: input.allDay ? istToInstant(addDays(endDate, 1), "00:00") : istToInstant(input.date, input.endTime!),
      weekday: null,
      start_time: null,
      end_time: null,
    },
  };
}

/** What a stored block looks like when listed. */
export type StoredBlock = {
  kind: string;
  starts_at: string | null;
  ends_at: string | null;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
};

/** "Every Wednesday · 9:00 AM–11:00 AM", "Sat, 3 Oct · all day", "3–5 Oct · all day". */
export function describeBlockedTime(b: StoredBlock, today: string): string {
  if (b.kind === "weekly" && b.weekday && b.start_time && b.end_time) {
    const day = WEEKDAYS[b.weekday - 1]?.long ?? "";
    return `Every ${day} · ${formatClock(b.start_time.slice(0, 5))}–${formatClock(b.end_time.slice(0, 5))}`;
  }
  if (b.starts_at && b.ends_at) {
    const startDay = istDateOf(b.starts_at);
    const startClock = istTimeOf(b.starts_at);
    const endClock = istTimeOf(b.ends_at);
    const allDay = startClock === "00:00" && endClock === "00:00";
    if (allDay) {
      const lastDay = addDays(istDateOf(b.ends_at), -1);
      return lastDay === startDay
        ? `${formatRelativeDay(startDay, today)} · all day`
        : `${formatRelativeDay(startDay, today)} to ${formatRelativeDay(lastDay, today)} · all day`;
    }
    return `${formatRelativeDay(startDay, today)} · ${formatClock(startClock)}–${formatClock(endClock)}`;
  }
  return "";
}

/** Weekly blocks always matter; one-offs only until they end. */
export function isCurrentBlock(b: StoredBlock, now: Date): boolean {
  if (b.kind === "weekly") return true;
  return b.ends_at !== null && new Date(b.ends_at).getTime() > now.getTime();
}
