import "server-only";
import { createServerClient } from "@/lib/supabase/server";

export type PatientListItem = {
  id: string;
  fullName: string;
  phone: string;
  opdNumber: string | null;
  age: number | null;
};

/**
 * Enough for years of a PG's patients. The Patients screen filters this list
 * on the phone, so search terms never travel in a URL (see lib/patients/search).
 */
const MAX_PATIENTS = 2000;

/** All of the PG's patients (not deleted), A–Z. */
export async function listPatients(): Promise<PatientListItem[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("patient")
    .select("id, full_name, phone, opd_number, age")
    .is("deleted_at", null)
    .order("full_name")
    .limit(MAX_PATIENTS);
  if (error) throw new Error(`Could not load patients: ${error.code}`);
  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    opdNumber: p.opd_number,
    age: p.age,
  }));
}

export async function getPatient(patientId: string): Promise<PatientListItem | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("patient")
    .select("id, full_name, phone, opd_number, age")
    .eq("id", patientId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load patient: ${error.code}`);
  return data
    ? { id: data.id, fullName: data.full_name, phone: data.phone, opdNumber: data.opd_number, age: data.age }
    : null;
}
