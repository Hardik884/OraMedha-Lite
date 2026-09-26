import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import { loadSchedulingData, type SchedulingData } from "./scheduling-query";

export type { SchedulingData };

/** The signed-in PG's timings, blocks and appointments, for the slot finder. */
export async function getSchedulingData(today: string = istToday()): Promise<SchedulingData> {
  return loadSchedulingData(await createServerClient(), today);
}
