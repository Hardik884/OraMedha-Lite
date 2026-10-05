import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/appointments/status";
import { LIVE_STATUSES, effectiveStatus } from "@/lib/appointments/timing";
import { addDays, istDayRange, istToday } from "@/lib/dates";
import { MESSAGE_KINDS, type MessageKind } from "@/lib/messages/templates";
import type { ReminderSlot } from "@/lib/messages/draft";
import type { ReminderTiming } from "@/lib/settings/reminders";
import type { Database } from "@/types/database.types";

type Row = Database["public"]["Views"]["appointment_overview"]["Row"];

export type LoggedMessage = { kind: MessageKind; reminder: ReminderSlot | null; forStartsAt: string; at: string };

export type AppointmentListItem = {
  id: string;
  startsAt: string;
  durationMin: number;
  /** As the PG sees it: "Unconfirmed" is worked out from the reminder preference. */
  status: AppointmentStatus;
  /** As stored. */
  storedStatus: AppointmentStatus;
  patientId: string;
  patientName: string;
  patientPhone: string;
  caseId: string | null;
  caseStatus: string | null;
  tooth: string | null;
  caseTypeName: string | null;
  stageName: string | null;
  purpose: "treatment" | "review";
  /** Messages opened in WhatsApp for this appointment. */
  messages: LoggedMessage[];
};

/** How statuses are worked out: the PG's reminder preference and "now". */
export type StatusClock = { timing: ReminderTiming; now: Date };

function asStatus(value: string | null): AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value ?? "") ? (value as AppointmentStatus) : "scheduled";
}

function toItem(a: Row, clock: StatusClock, log: Map<string, LoggedMessage[]>): AppointmentListItem | null {
  if (!a.appointment_id || !a.starts_at || !a.patient_id || !a.patient_name) return null;
  const stored = asStatus(a.status);
  return {
    id: a.appointment_id,
    startsAt: a.starts_at,
    durationMin: a.duration_min ?? 30,
    status: effectiveStatus({ status: stored, startsAt: a.starts_at }, clock.timing, clock.now),
    storedStatus: stored,
    patientId: a.patient_id,
    patientName: a.patient_name,
    patientPhone: a.patient_phone ?? "",
    caseId: a.case_id,
    caseStatus: a.case_status,
    tooth: a.tooth,
    caseTypeName: a.case_type_name,
    stageName: a.stage_name,
    purpose: a.purpose === "review" ? "review" : "treatment",
    messages: log.get(a.appointment_id) ?? [],
  };
}

export async function messagesFor(ids: string[]): Promise<Map<string, LoggedMessage[]>> {
  const map = new Map<string, LoggedMessage[]>();
  if (ids.length === 0) return map;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("message_log")
    .select("appointment_id, kind, reminder, for_starts_at, created_at")
    .in("appointment_id", ids)
    .order("created_at");
  if (error) throw new Error(`Could not load messages: ${error.code}`);
  for (const m of data) {
    if (!(MESSAGE_KINDS as readonly string[]).includes(m.kind)) continue;
    const list = map.get(m.appointment_id) ?? [];
    list.push({
      kind: m.kind as MessageKind,
      reminder: m.reminder === "soon" ? "soon" : m.reminder === "evening" ? "evening" : null,
      forStartsAt: m.for_starts_at,
      at: m.created_at,
    });
    map.set(m.appointment_id, list);
  }
  return map;
}

async function withMessages(rows: Row[], clock: StatusClock): Promise<AppointmentListItem[]> {
  const log = await messagesFor(rows.flatMap((r) => (r.appointment_id ? [r.appointment_id] : [])));
  return rows.flatMap((r) => {
    const item = toItem(r, clock, log);
    return item ? [item] : [];
  });
}

/** One India calendar day's appointments, in time order. Cancelled ones are left out. */
export async function getAppointmentsOn(date: string, clock: StatusClock): Promise<AppointmentListItem[]> {
  const supabase = await createServerClient();
  const { start, end } = istDayRange(date);
  const { data, error } = await supabase
    .from("appointment_overview")
    .select("*")
    .gte("starts_at", start)
    .lt("starts_at", end)
    .neq("status", "cancelled")
    .order("starts_at");
  if (error) throw new Error(`Could not load appointments: ${error.code}`);
  return withMessages(data, clock);
}

/** One appointment, whatever its status. */
export async function getAppointment(id: string, clock: StatusClock): Promise<AppointmentListItem | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("appointment_overview").select("*").eq("appointment_id", id).maybeSingle();
  if (error) throw new Error(`Could not load appointment: ${error.code}`);
  if (!data) return null;
  return (await withMessages([data], clock))[0] ?? null;
}

/** Appointments still to happen from now until the end of tomorrow (reminders, "unconfirmed"). */
export async function getComingUp(clock: StatusClock): Promise<AppointmentListItem[]> {
  const supabase = await createServerClient();
  const { end } = istDayRange(addDays(istToday(clock.now), 1));
  const { data, error } = await supabase
    .from("appointment_overview")
    .select("*")
    .in("status", [...LIVE_STATUSES])
    .gt("starts_at", clock.now.toISOString())
    .lt("starts_at", end)
    .order("starts_at");
  if (error) throw new Error(`Could not load appointments: ${error.code}`);
  return withMessages(data, clock);
}

/** Appointments from before today that were never updated ("Did they come?"). */
export async function getNeverUpdated(clock: StatusClock): Promise<AppointmentListItem[]> {
  const supabase = await createServerClient();
  const { start } = istDayRange(istToday(clock.now));
  const { data, error } = await supabase
    .from("appointment_overview")
    .select("*")
    .in("status", [...LIVE_STATUSES])
    .lt("starts_at", start)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load appointments: ${error.code}`);
  return withMessages(data, clock);
}

/** Each case's next appointment still to come (for the "send the new time" messages). */
export async function getNextForCases(caseIds: string[], clock: StatusClock): Promise<Map<string, AppointmentListItem>> {
  const next = new Map<string, AppointmentListItem>();
  if (caseIds.length === 0) return next;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("appointment_overview")
    .select("*")
    .in("case_id", caseIds)
    .in("status", [...LIVE_STATUSES])
    .gt("starts_at", clock.now.toISOString())
    .order("starts_at");
  if (error) throw new Error(`Could not load appointments: ${error.code}`);
  for (const a of await withMessages(data, clock)) if (a.caseId && !next.has(a.caseId)) next.set(a.caseId, a);
  return next;
}
