import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/appointments/status";
import { istDayRange } from "@/lib/dates";

export type AppointmentListItem = {
  id: string;
  startsAt: string;
  durationMin: number;
  status: AppointmentStatus;
  patientId: string;
  patientName: string;
  caseId: string | null;
  tooth: string | null;
  caseTypeName: string | null;
  stageName: string | null;
};

/** One India calendar day's appointments, in time order. Cancelled ones are left out. */
export async function getAppointmentsOn(date: string): Promise<AppointmentListItem[]> {
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

  return data.flatMap((a) =>
    a.appointment_id && a.starts_at && a.patient_id && a.patient_name
      ? [
          {
            id: a.appointment_id,
            startsAt: a.starts_at,
            durationMin: a.duration_min ?? 30,
            status: (APPOINTMENT_STATUSES as readonly string[]).includes(a.status ?? "")
              ? (a.status as AppointmentStatus)
              : "scheduled",
            patientId: a.patient_id,
            patientName: a.patient_name,
            caseId: a.case_id,
            tooth: a.tooth,
            caseTypeName: a.case_type_name,
            stageName: a.stage_name,
          },
        ]
      : [],
  );
}
