import { formatTime, formatWeekdayDate, istDateOf, istToday } from "@/lib/dates";

/**
 * Every message OraMedha writes to a patient, in one place.
 *
 * Privacy: family members often share one phone, so messages carry only the
 * patient's name, the date and time, and who it's from (the PG and college).
 * Never the case, tooth, stage or anything clinical — MessageContext has no
 * field for it on purpose.
 *
 * Languages: English now. Adding Hindi or Marathi is one more entry in
 * TEMPLATES (with its own date wording); screens don't change.
 */
export const MESSAGE_KINDS = ["booked", "reminder", "rescheduled", "missed"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const LANGUAGES = ["en"] as const;
export type Language = (typeof LANGUAGES)[number];

export type MessageContext = {
  patientName: string;
  pgName: string;
  college: string;
  /** The appointment (for "missed": the one that was missed). */
  startsAt: string;
  /** When the message is written — decides "today" / "tomorrow" in reminders. */
  now: Date;
};

type Parts = {
  name: string;
  signature: string;
  /** "Tue, 29 Sep" */
  date: string;
  /** "11:00 AM" */
  time: string;
  /** Days from today to the appointment (0 = today). */
  daysAway: number;
};

const TEMPLATES: Record<Language, Record<MessageKind, (p: Parts) => string>> = {
  en: {
    booked: (p) =>
      `Hello ${p.name}, your dental appointment is booked for ${p.date} at ${p.time}. ` +
      `Please reply YES to confirm, or tell us if you need another time.\n${p.signature}`,
    reminder: (p) => {
      const when =
        p.daysAway === 0
          ? `today at ${p.time}`
          : p.daysAway === 1
            ? `tomorrow, ${p.date} at ${p.time}`
            : `on ${p.date} at ${p.time}`;
      return (
        `Hello ${p.name}, this is a reminder of your dental appointment ${when}. ` +
        `Please reply YES to confirm.\n${p.signature}`
      );
    },
    rescheduled: (p) =>
      `Hello ${p.name}, your dental appointment has been moved to ${p.date} at ${p.time}. ` +
      `Please reply YES to confirm, or tell us if this time doesn't suit you.\n${p.signature}`,
    missed: (p) =>
      `Hello ${p.name}, we missed you at your dental appointment on ${p.date}. ` +
      `Please call us or reply here so we can book a new time.\n${p.signature}`,
  },
};

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

export function messageText(kind: MessageKind, ctx: MessageContext, lang: Language = "en"): string {
  const today = istToday(ctx.now);
  const day = istDateOf(ctx.startsAt);
  const daysAway = Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000);
  return TEMPLATES[lang][kind]({
    name: tidy(ctx.patientName),
    signature: `— ${tidy(ctx.pgName)}, ${tidy(ctx.college)}`,
    date: formatWeekdayDate(day, today),
    time: formatTime(ctx.startsAt),
    daysAway,
  });
}

/** What each message is called on buttons and in the history. */
export const MESSAGE_LABELS: Record<MessageKind, string> = {
  booked: "Appointment booked",
  reminder: "Reminder",
  rescheduled: "Appointment moved",
  missed: "Missed — please call us",
};
