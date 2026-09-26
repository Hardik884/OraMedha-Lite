"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { isIsoDate, isTime, istToInstant } from "@/lib/dates";
import { TRANSITIONS } from "@/lib/appointments/actions";
import { MESSAGE_KINDS, type MessageKind } from "@/lib/messages/templates";
import type { ReminderSlot } from "@/lib/messages/draft";
import { bookedPath } from "@/lib/navigation/paths";

export type AppointmentActionResult = { ok: true } | { ok: false; error: string };

const FAILED = "Couldn't save. Check your internet and try again.";

/**
 * The PG tapped "Send on WhatsApp": record that WhatsApp was OPENED with the
 * message. Whether it was sent or delivered, OraMedha can't know yet.
 */
export async function recordMessageOpened(input: {
  appointmentId: string;
  kind: MessageKind;
  reminder: ReminderSlot | null;
  forStartsAt: string;
}): Promise<AppointmentActionResult & { at?: string }> {
  if (!isUuid(input.appointmentId) || !MESSAGE_KINDS.includes(input.kind) || Number.isNaN(Date.parse(input.forStartsAt))) {
    return { ok: false, error: FAILED };
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("message_log")
    .insert({
      appointment_id: input.appointmentId,
      kind: input.kind,
      reminder: input.kind === "reminder" ? (input.reminder === "soon" ? "soon" : "evening") : null,
      for_starts_at: input.forStartsAt,
    })
    .select("created_at")
    .single();
  if (error) return { ok: false, error: FAILED };
  return { ok: true, at: data.created_at };
}

type StatusChange = keyof typeof TRANSITIONS;

/**
 * Mark confirmed / missed / cancelled, or "they came" (completed) for a
 * visit too long ago to record. Only an appointment still to happen can
 * change, and only in a way that makes sense for its time.
 */
export async function setAppointmentStatus(input: {
  appointmentId: string;
  to: StatusChange;
}): Promise<AppointmentActionResult> {
  // Own keys only: `in` would also accept inherited names such as "toString".
  if (!isUuid(input.appointmentId) || !Object.hasOwn(TRANSITIONS, input.to)) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("appointment")
    .update({ status: input.to, status_changed_at: now })
    .eq("id", input.appointmentId)
    .is("deleted_at", null)
    .in("status", TRANSITIONS[input.to]);
  if (input.to === "confirmed") query = query.gt("starts_at", now);
  if (input.to === "missed" || input.to === "completed") query = query.lte("starts_at", now);

  const { data, error } = await query.select("id");
  if (error) return { ok: false, error: FAILED };
  if (!data || data.length === 0) {
    return { ok: false, error: "This appointment has already changed. Pull down to refresh." };
  }
  return { ok: true };
}

/** Move an appointment, or book the follow-on to a missed/cancelled one. */
export async function rescheduleAppointment(input: {
  patientId: string;
  appointmentId: string;
  newId: string;
  date: string;
  time: string;
  durationMin: number;
}): Promise<{ formError?: string }> {
  if (![input.patientId, input.appointmentId, input.newId].every(isUuid)) return { formError: FAILED };
  if (!isIsoDate(input.date) || !isTime(input.time)) return { formError: "Choose a date and time." };
  if (!Number.isInteger(input.durationMin) || input.durationMin < 5 || input.durationMin > 480) {
    return { formError: "Choose a duration." };
  }
  const startsAt = istToInstant(input.date, input.time);
  if (Date.parse(startsAt) <= Date.now()) return { formError: "That time has already passed. Pick another." };

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: input.appointmentId,
    p_new_id: input.newId,
    p_starts_at: startsAt,
    p_duration_min: input.durationMin,
  });
  if (error || !data) return { formError: error?.message.includes("passed") ? error.message : FAILED };
  redirect(bookedPath(input.patientId, data, { rescheduled: true }));
}
