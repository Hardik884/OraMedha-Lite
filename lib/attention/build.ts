import { istDateOf } from "@/lib/dates";
import type { AppointmentStatus } from "@/lib/appointments/status";
import { canRecordVisitOn } from "@/lib/visits/backdate";

/**
 * "Needs attention": the one list behind both the box on Today and the
 * Pending tab, so their counts always agree. Each item has one obvious action.
 *
 *   forgotten   — a past appointment never updated ("Did Rahul come on 25 Sep?")
 *   unconfirmed — coming up, and the patient hasn't confirmed
 *   missed      — the case's last appointment was missed, nothing booked since
 *   reschedule  — the case's last appointment was cancelled, nothing booked since
 *   no_next     — an ongoing case with no next appointment
 *
 * A case appears once: one waiting for "Did they come?" isn't also listed as
 * having no next appointment.
 */
export type AttentionCategory = "forgotten" | "unconfirmed" | "missed" | "reschedule" | "no_next";

export type AttentionAppointment = {
  id: string;
  startsAt: string;
  /** Effective status (see lib/appointments/timing). */
  status: AppointmentStatus;
  patientId: string;
  patientName: string;
  patientPhone: string;
  caseId: string | null;
  caseLabel: string | null;
  purpose: "treatment" | "review";
};

export type AttentionCase = {
  caseId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  caseLabel: string;
  stageName: string | null;
  /** The case's most recent appointment, whatever its status. */
  last: { id: string; status: AppointmentStatus; startsAt: string } | null;
};

export type AttentionItem =
  | { category: "forgotten"; key: string; appointment: AttentionAppointment; canRecordVisit: boolean }
  | { category: "unconfirmed"; key: string; appointment: AttentionAppointment }
  | { category: "missed" | "reschedule"; key: string; kase: AttentionCase; last: NonNullable<AttentionCase["last"]> }
  | { category: "no_next"; key: string; kase: AttentionCase };

export type AttentionCounts = Record<AttentionCategory, number> & { total: number };

export const ATTENTION_ORDER: AttentionCategory[] = ["forgotten", "unconfirmed", "missed", "reschedule", "no_next"];

export function buildAttention(input: {
  /** Live (never updated) appointments that started before now. */
  pastLive: AttentionAppointment[];
  /** Appointments still to come, with their effective status. */
  upcoming: AttentionAppointment[];
  casesWithoutNext: AttentionCase[];
  today: string;
  now: Date;
}): { items: AttentionItem[]; counts: AttentionCounts } {
  const forgotten = input.pastLive
    .filter((a) => istDateOf(a.startsAt) < input.today)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map(
      (a): AttentionItem => ({
        category: "forgotten",
        key: `forgotten-${a.id}`,
        appointment: a,
        canRecordVisit: a.caseId !== null && canRecordVisitOn(istDateOf(a.startsAt), input.today),
      }),
    );
  const waitingCases = new Set(forgotten.map((f) => (f.category === "forgotten" ? f.appointment.caseId : null)));

  const unconfirmed = input.upcoming
    .filter((a) => a.status === "unconfirmed" && Date.parse(a.startsAt) > input.now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((a): AttentionItem => ({ category: "unconfirmed", key: `unconfirmed-${a.id}`, appointment: a }));

  const byCase: AttentionItem[] = input.casesWithoutNext
    .filter((c) => !waitingCases.has(c.caseId))
    .map((c): AttentionItem => {
      if (c.last?.status === "missed") return { category: "missed", key: `missed-${c.caseId}`, kase: c, last: c.last };
      if (c.last?.status === "cancelled") {
        return { category: "reschedule", key: `reschedule-${c.caseId}`, kase: c, last: c.last };
      }
      return { category: "no_next", key: `no_next-${c.caseId}`, kase: c };
    });

  const items = [...forgotten, ...unconfirmed, ...byCase].sort(
    (a, b) => ATTENTION_ORDER.indexOf(a.category) - ATTENTION_ORDER.indexOf(b.category),
  );
  const counts = Object.fromEntries(ATTENTION_ORDER.map((c) => [c, items.filter((i) => i.category === c).length])) as Record<
    AttentionCategory,
    number
  >;
  return { items, counts: { ...counts, total: items.length } };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The lines of the "Needs attention" box on Today. */
export function attentionLines(counts: AttentionCounts): { category: AttentionCategory; text: string }[] {
  const text: Record<AttentionCategory, (n: number) => string> = {
    forgotten: (n) => `${plural(n, "past appointment", "past appointments")} not updated`,
    unconfirmed: (n) => `${plural(n, "appointment", "appointments")} unconfirmed`,
    missed: (n) => `${plural(n, "patient", "patients")} missed an appointment`,
    reschedule: (n) => `${plural(n, "case needs", "cases need")} rescheduling`,
    no_next: (n) => `${plural(n, "case", "cases")} with no next appointment`,
  };
  return ATTENTION_ORDER.filter((c) => counts[c] > 0).map((c) => ({ category: c, text: text[c](counts[c]) }));
}

/** Group headings on the Pending tab. */
export const ATTENTION_HEADINGS: Record<AttentionCategory, string> = {
  forgotten: "Did they come?",
  unconfirmed: "Not confirmed yet",
  missed: "Missed",
  reschedule: "Needs rescheduling",
  no_next: "No next appointment",
};
