import { formatAppointmentWhen, formatShortDate, formatTime, istDateOf } from "@/lib/dates";
import { draftMessage, openedAt, type MessageDraft, type ReminderSlot } from "@/lib/messages/draft";
import type { MessageKind } from "@/lib/messages/templates";
import type { AttentionCategory, AttentionItem } from "./build";

type Logged = { kind: MessageKind; reminder: ReminderSlot | null; forStartsAt: string; at: string };

/** One row of the Pending tab, as plain data for the phone. */
export type AttentionRowData = {
  key: string;
  category: AttentionCategory;
  patientId: string;
  patientName: string;
  caseId: string | null;
  title: string;
  detail: string;
  appointmentId: string | null;
  /** forgotten: the day to record the visit for, if it can still be recorded. */
  visitDate: string | null;
  message: { draft: MessageDraft; openedAt: string | null } | null;
};

export function attentionRow(
  item: AttentionItem,
  ctx: {
    pg: { fullName: string; college: string };
    now: Date;
    today: string;
    messages: Map<string, Logged[]>;
    /** Which reminder applies now for an unconfirmed appointment. */
    reminderSlot: (startsAt: string) => ReminderSlot;
  },
): AttentionRowData {
  const msg = (kind: MessageKind, appt: { id: string; startsAt: string; patientName: string; patientPhone: string }, slot: ReminderSlot | null = null) => {
    const draft = draftMessage(kind, appt, ctx.pg, ctx.now, slot);
    return { draft, openedAt: openedAt(ctx.messages.get(appt.id) ?? [], draft) };
  };

  switch (item.category) {
    case "forgotten": {
      const a = item.appointment;
      const day = istDateOf(a.startsAt);
      return {
        key: item.key,
        category: item.category,
        patientId: a.patientId,
        patientName: a.patientName,
        caseId: a.caseId,
        title: `Did ${a.patientName} come on ${formatShortDate(day, ctx.today)}?`,
        detail: [formatTime(a.startsAt), a.purpose === "review" ? "Review visit" : a.caseLabel].filter(Boolean).join(" · "),
        appointmentId: a.id,
        visitDate: item.canRecordVisit ? day : null,
        message: msg("missed", a),
      };
    }
    case "unconfirmed": {
      const a = item.appointment;
      return {
        key: item.key,
        category: item.category,
        patientId: a.patientId,
        patientName: a.patientName,
        caseId: a.caseId,
        title: a.patientName,
        detail: `${formatAppointmentWhen(a.startsAt, ctx.today)} · not confirmed`,
        appointmentId: a.id,
        visitDate: null,
        message: msg("reminder", a, ctx.reminderSlot(a.startsAt)),
      };
    }
    case "missed":
    case "reschedule": {
      const c = item.kase;
      const appt = { id: item.last.id, startsAt: item.last.startsAt, patientName: c.patientName, patientPhone: c.patientPhone };
      const when = formatShortDate(istDateOf(item.last.startsAt), ctx.today);
      return {
        key: item.key,
        category: item.category,
        patientId: c.patientId,
        patientName: c.patientName,
        caseId: c.caseId,
        title: c.patientName,
        detail: `${item.category === "missed" ? "Missed" : "Cancelled"} ${when} · ${c.caseLabel}`,
        appointmentId: item.last.id,
        visitDate: null,
        message: item.category === "missed" ? msg("missed", appt) : null,
      };
    }
    case "no_next": {
      const c = item.kase;
      return {
        key: item.key,
        category: item.category,
        patientId: c.patientId,
        patientName: c.patientName,
        caseId: c.caseId,
        title: c.patientName,
        detail: [c.caseLabel, c.stageName].filter(Boolean).join(" · "),
        appointmentId: null,
        visitDate: null,
        message: null,
      };
    }
  }
}
