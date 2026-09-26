/**
 * When patients get their appointment reminder. Today lists the reminders
 * due (one tap each opens WhatsApp), and an appointment not confirmed by
 * then shows as Unconfirmed (lib/appointments/timing.ts).
 */
export const REMINDER_TIMINGS = [
  { value: "evening_before", label: "The evening before", description: "Today lists tomorrow’s patients from 4 PM" },
  { value: "two_hours_before", label: "2 hours before", description: "Today nudges you shortly before each appointment" },
  { value: "both", label: "Both", description: "The evening before and 2 hours before" },
] as const;

export type ReminderTiming = (typeof REMINDER_TIMINGS)[number]["value"];

export function isReminderTiming(value: unknown): value is ReminderTiming {
  return REMINDER_TIMINGS.some((r) => r.value === value);
}

export function reminderLabel(value: string): string {
  return REMINDER_TIMINGS.find((r) => r.value === value)?.label ?? "The evening before";
}
