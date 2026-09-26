"use server";

import { redirect } from "next/navigation";
import { parseIndianMobile } from "@/lib/auth/phone";
import type { SamePhonePatient } from "@/lib/patients/duplicates";
import { createServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import { istToday } from "@/lib/dates";
import {
  validateNewCase,
  validateNewPatient,
  type FieldErrors,
  type NewPatientFields,
} from "@/lib/patients/validate";
import { validateAppointment } from "@/lib/appointments/validate";
import { bookedPath, schedulePath } from "@/lib/navigation/paths";

/**
 * Every action here is SAFE TO RETRY. The phone generates the new row's id
 * before the first attempt and sends the same id again on retry; the database
 * functions and the appointment insert recognise it, so a flaky connection
 * can never create a duplicate patient, case or appointment.
 */
export type ActionResult<K extends string = string> = {
  errors?: FieldErrors<K>;
  formError?: string;
};

const SAVE_FAILED = "Couldn't save. Check your internet and try again.";
/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

async function toothRequiredFor(caseTypeId: string): Promise<boolean | null> {
  if (!isUuid(caseTypeId)) return null;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("case_type")
    .select("tooth_required")
    .eq("id", caseTypeId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? data.tooth_required : null;
}

// ── New patient + first case + today's visit ────────────────────────────────
export async function createPatientWithCase(input: {
  patientId: string;
  caseId: string;
  stageId: string;
  fields: NewPatientFields;
}): Promise<ActionResult<keyof NewPatientFields>> {
  if (!isUuid(input.patientId) || !isUuid(input.caseId) || !isUuid(input.stageId)) {
    return { formError: SAVE_FAILED };
  }
  const toothRequired = await toothRequiredFor(input.fields.caseTypeId);
  if (toothRequired === null) return { errors: { caseTypeId: "Choose the case type" } };

  const result = validateNewPatient(input.fields, toothRequired);
  if (!result.ok) return { errors: result.errors };
  const v = result.value;

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("create_patient_with_case", {
    p_patient_id: input.patientId,
    p_full_name: v.fullName,
    p_phone: v.phone,
    p_case_id: input.caseId,
    p_case_type_id: v.caseTypeId,
    p_stage_id: input.stageId,
    p_age: v.age ?? undefined,
    p_opd_number: v.opdNumber ?? undefined,
    p_tooth: v.tooth ?? undefined,
  });
  if (error) {
    console.error("createPatientWithCase failed", error.code);
    return { formError: SAVE_FAILED };
  }

  redirect(schedulePath(input.patientId, input.caseId, { isNew: true }));
}

// ── Another case for an existing patient ────────────────────────────────────
export async function addCaseToPatient(input: {
  patientId: string;
  caseId: string;
  stageId: string;
  fields: { tooth: string; caseTypeId: string };
}): Promise<ActionResult<"tooth" | "caseTypeId">> {
  if (!isUuid(input.patientId) || !isUuid(input.caseId) || !isUuid(input.stageId)) {
    return { formError: SAVE_FAILED };
  }
  const toothRequired = await toothRequiredFor(input.fields.caseTypeId);
  if (toothRequired === null) return { errors: { caseTypeId: "Choose the case type" } };

  const result = validateNewCase(input.fields, toothRequired);
  if (!result.ok) return { errors: result.errors };

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("start_case", {
    p_case_id: input.caseId,
    p_patient_id: input.patientId,
    p_case_type_id: result.value.caseTypeId,
    p_stage_id: input.stageId,
    p_tooth: result.value.tooth ?? undefined,
  });
  if (error) {
    console.error("addCaseToPatient failed", error.code);
    return { formError: SAVE_FAILED };
  }

  redirect(schedulePath(input.patientId, input.caseId, { isNew: true }));
}

// ── Book the next appointment (manual) ──────────────────────────────────────
export async function scheduleAppointment(input: {
  appointmentId: string;
  patientId: string;
  caseId: string;
  date: string;
  time: string;
  durationMin: number;
  /** Booked as step 3 of New Patient / a new case. */
  isNew?: boolean;
}): Promise<ActionResult<"date" | "time" | "durationMin">> {
  if (!isUuid(input.appointmentId) || !isUuid(input.patientId) || !isUuid(input.caseId)) {
    return { formError: SAVE_FAILED };
  }
  const now = new Date();
  const result = validateAppointment(input, now, istToday(now));
  if (!result.ok) return { errors: result.errors };

  const supabase = await createServerClient();
  // A completed case can only be booked for a review/recall.
  const { data: kase } = await supabase.from("patient_case").select("status").eq("id", input.caseId).maybeSingle();
  const { error } = await supabase.from("appointment").insert({
    id: input.appointmentId,
    patient_id: input.patientId,
    case_id: input.caseId,
    starts_at: result.value.startsAt,
    duration_min: result.value.durationMin,
    status: "scheduled",
    purpose: kase?.status === "completed" ? "review" : "treatment",
  });
  // A retry of a save that already landed: the appointment is booked.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error("scheduleAppointment failed", error.code);
    return { formError: SAVE_FAILED };
  }

  // Next: offer the "appointment booked" message.
  redirect(bookedPath(input.patientId, input.appointmentId, { isNew: input.isNew }));
}

/**
 * Patients of this PG who already have this mobile number (for the gentle
 * "same person?" hint on New Patient). Row Level Security keeps it to the
 * signed-in PG's own patients; the number travels in the request body only.
 */
export async function findPatientsWithPhone(input: { phone: string }): Promise<SamePhonePatient[]> {
  const parsed = parseIndianMobile(typeof input.phone === "string" ? input.phone : "");
  if (!parsed.ok) return [];
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("patient")
    .select("id, full_name")
    .eq("phone", parsed.national)
    .is("deleted_at", null)
    .order("created_at")
    .limit(5);
  if (error) return [];
  return data.map((p) => ({ id: p.id, fullName: p.full_name }));
}
