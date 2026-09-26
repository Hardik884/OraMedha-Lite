import { appointmentDrafts, openedAt, type AppointmentDrafts, type ReminderSlot } from "@/lib/messages/draft";
import type { MessageKind } from "@/lib/messages/templates";
import type { AppointmentStatus } from "./status";

/**
 * Everything the phone needs to manage one appointment (status actions and
 * messages), built on the server. Plain data, so it can go to a client
 * component.
 */
export type ManagedAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  caseId: string | null;
  startsAt: string;
  durationMin: number;
  status: AppointmentStatus;
  drafts: AppointmentDrafts;
  /** When each message was last opened in WhatsApp for this appointment's time. */
  opened: Record<"booked" | "rescheduled" | "missed", string | null>;
};

type Source = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  caseId: string | null;
  startsAt: string;
  durationMin: number;
  status: AppointmentStatus;
  messages: { kind: MessageKind; reminder: ReminderSlot | null; forStartsAt: string; at: string }[];
};

export function toManaged(a: Source, pg: { fullName: string; college: string }, now: Date): ManagedAppointment {
  const drafts = appointmentDrafts(a, pg, now);
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    caseId: a.caseId,
    startsAt: a.startsAt,
    durationMin: a.durationMin,
    status: a.status,
    drafts,
    opened: {
      booked: openedAt(a.messages, drafts.booked),
      rescheduled: openedAt(a.messages, drafts.rescheduled),
      missed: openedAt(a.messages, drafts.missed),
    },
  };
}
