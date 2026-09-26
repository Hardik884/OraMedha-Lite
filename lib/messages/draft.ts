import { messageText, type MessageKind } from "./templates";

/**
 * A message ready to go to one patient about one appointment. Built on the
 * server (it needs the PG's name and college) and handed to sendMessage() on
 * the phone. Screens never build message text themselves.
 */
export type ReminderSlot = "evening" | "soon";

export type MessageDraft = {
  kind: MessageKind;
  reminder: ReminderSlot | null;
  appointmentId: string;
  /** The appointment time this message is about (a reminder counts only for that time). */
  forStartsAt: string;
  phone: string;
  text: string;
};

export function draftMessage(
  kind: MessageKind,
  appt: { id: string; startsAt: string; patientName: string; patientPhone: string },
  pg: { fullName: string; college: string },
  now: Date,
  reminder: ReminderSlot | null = null,
): MessageDraft {
  return {
    kind,
    reminder: kind === "reminder" ? (reminder ?? "evening") : null,
    appointmentId: appt.id,
    forStartsAt: appt.startsAt,
    phone: appt.patientPhone,
    text: messageText(kind, {
      patientName: appt.patientName,
      pgName: pg.fullName,
      college: pg.college,
      startsAt: appt.startsAt,
      now,
    }),
  };
}

/** Was this message already opened for the appointment's current time? */
export function openedAt(
  log: { kind: MessageKind; reminder: ReminderSlot | null; forStartsAt: string; at: string }[],
  draft: Pick<MessageDraft, "kind" | "reminder" | "forStartsAt">,
): string | null {
  const hits = log.filter(
    (m) =>
      m.kind === draft.kind &&
      m.reminder === draft.reminder &&
      Date.parse(m.forStartsAt) === Date.parse(draft.forStartsAt),
  );
  return hits.length > 0 ? hits.map((m) => m.at).sort().at(-1)! : null;
}

/** The messages a screen may offer for one appointment. */
export type AppointmentDrafts = { booked: MessageDraft; rescheduled: MessageDraft; missed: MessageDraft };

export function appointmentDrafts(
  appt: { id: string; startsAt: string; patientName: string; patientPhone: string },
  pg: { fullName: string; college: string },
  now: Date,
): AppointmentDrafts {
  return {
    booked: draftMessage("booked", appt, pg, now),
    rescheduled: draftMessage("rescheduled", appt, pg, now),
    missed: draftMessage("missed", appt, pg, now),
  };
}
