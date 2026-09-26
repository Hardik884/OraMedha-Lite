/**
 * When patients get their appointment reminder. Stored now; the reminder
 * sending itself arrives with patient messages (Slice 7).
 */
export const REMINDER_TIMINGS = [
  { value: "evening_before", label: "The evening before", description: "Around 7 PM the day before" },
  { value: "two_hours_before", label: "2 hours before", description: "On the day of the appointment" },
  { value: "both", label: "Both", description: "The evening before and 2 hours before" },
] as const;

export type ReminderTiming = (typeof REMINDER_TIMINGS)[number]["value"];

export function isReminderTiming(value: unknown): value is ReminderTiming {
  return REMINDER_TIMINGS.some((r) => r.value === value);
}

export function reminderLabel(value: string): string {
  return REMINDER_TIMINGS.find((r) => r.value === value)?.label ?? "The evening before";
}
