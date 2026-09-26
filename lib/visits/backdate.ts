import { addDays } from "@/lib/dates";

/**
 * A forgotten visit can be recorded up to a week later. Beyond that the PG
 * can still say the patient came, but the visit itself isn't backfilled.
 */
export const MAX_DAYS_BACK = 7;

export function canRecordVisitOn(date: string, today: string): boolean {
  return date <= today && date >= addDays(today, -MAX_DAYS_BACK);
}
