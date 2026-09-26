import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addDays, istDayRange } from "@/lib/dates";
import { parseWorkingHours, type WorkingHours } from "@/lib/scheduling/defaults";
import type { BlockedPeriod, BusyAppointment } from "@/lib/scheduling/slot-finder";

/**
 * What the slot finder needs, for the signed-in PG only.
 *
 * Takes the Supabase client as a parameter (no server-only import) so the
 * database specs can run exactly this query as two different PGs and prove
 * that one PG's appointments never reach the other's slot finder. Row Level
 * Security is what guarantees it; nothing here filters by PG.
 */
export type SchedulingData = {
  workingHours: WorkingHours;
  slotStepMin: number;
  blocked: BlockedPeriod[];
  appointments: BusyAppointment[];
};

/** How far ahead appointments are loaded — well past any usual window. */
export const SCHEDULING_HORIZON_DAYS = 120;

export async function loadSchedulingData(
  client: SupabaseClient<Database>,
  today: string,
): Promise<SchedulingData> {
  const from = istDayRange(today).start;
  const to = istDayRange(addDays(today, SCHEDULING_HORIZON_DAYS)).end;

  const [prefs, blocks, appts] = await Promise.all([
    client.from("pg_preferences").select("working_hours, slot_step_min").maybeSingle(),
    client
      .from("pg_blocked_time")
      .select("label, kind, starts_at, ends_at, weekday, start_time, end_time")
      .is("deleted_at", null),
    client
      .from("appointment_overview")
      .select("appointment_id, starts_at, duration_min, status, patient_name")
      .gte("starts_at", from)
      .lt("starts_at", to)
      .neq("status", "cancelled"),
  ]);
  for (const r of [prefs, blocks, appts]) {
    if (r.error) throw new Error(`Could not load scheduling data: ${r.error.code}`);
  }

  const blocked: BlockedPeriod[] = blocks.data!.flatMap((b): BlockedPeriod[] => {
    if (b.kind === "weekly" && b.weekday && b.start_time && b.end_time) {
      return [{ kind: "weekly", label: b.label, weekday: b.weekday, startTime: b.start_time, endTime: b.end_time }];
    }
    if (b.kind === "one_off" && b.starts_at && b.ends_at && b.ends_at > from) {
      return [{ kind: "one_off", label: b.label, startsAt: b.starts_at, endsAt: b.ends_at }];
    }
    return [];
  });

  return {
    workingHours: parseWorkingHours(prefs.data?.working_hours ?? null),
    slotStepMin: prefs.data?.slot_step_min ?? 15,
    blocked,
    appointments: appts.data!.flatMap((a) =>
      a.appointment_id && a.starts_at && a.duration_min
        ? [
            {
              id: a.appointment_id,
              startsAt: a.starts_at,
              durationMin: a.duration_min,
              status: a.status ?? undefined,
              label: a.patient_name ?? undefined,
            },
          ]
        : [],
    ),
  };
}
