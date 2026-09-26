import "server-only";
import { buildAttention, type AttentionAppointment, type AttentionCase } from "@/lib/attention/build";
import { caseLabel } from "@/lib/cases/status";
import { istToday } from "@/lib/dates";
import { getCasesNeedingAppointment } from "./cases";
import { getNeverUpdated, messagesFor, type AppointmentListItem, type LoggedMessage, type StatusClock } from "./appointments";

function toAttentionAppointment(a: AppointmentListItem): AttentionAppointment {
  return {
    id: a.id,
    startsAt: a.startsAt,
    status: a.status,
    patientId: a.patientId,
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    caseId: a.caseId,
    caseLabel: a.caseTypeName ? caseLabel(a.tooth, a.caseTypeName) : null,
    purpose: a.purpose,
  };
}

/**
 * Everything on the Pending tab / "Needs attention" box, from one list.
 * `comingUp` is passed in because Today already loads it for reminders.
 */
export async function getAttention(clock: StatusClock, comingUp: AppointmentListItem[]) {
  const [neverUpdated, cases] = await Promise.all([getNeverUpdated(clock), getCasesNeedingAppointment()]);
  const casesWithoutNext: AttentionCase[] = cases.map((c) => ({
    caseId: c.caseId,
    patientId: c.patientId,
    patientName: c.patientName,
    patientPhone: c.patientPhone,
    caseLabel: caseLabel(c.tooth, c.caseTypeName),
    stageName: c.currentStageName,
    last: c.lastAppointment,
  }));
  const built = buildAttention({
    pastLive: neverUpdated.map(toAttentionAppointment),
    upcoming: comingUp.map(toAttentionAppointment),
    casesWithoutNext,
    today: istToday(clock.now),
    now: clock.now,
  });

  // What was already opened in WhatsApp, for every appointment on the list.
  const messages = new Map<string, LoggedMessage[]>();
  for (const a of [...neverUpdated, ...comingUp]) messages.set(a.id, a.messages);
  const lastIds = casesWithoutNext.flatMap((c) => (c.last ? [c.last.id] : []));
  for (const [id, list] of await messagesFor(lastIds)) messages.set(id, list);

  return { ...built, messages };
}
