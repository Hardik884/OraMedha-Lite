import { isLive } from "./timing";
import type { AppointmentStatus } from "./status";

/**
 * What the PG can do with one appointment, in the order the sheet lists them.
 * Visits are recorded through Update Visit, not here.
 */
export type AppointmentAction = "message_booked" | "message_missed" | "confirm" | "missed" | "reschedule" | "cancel";

export function availableActions(appt: { status: AppointmentStatus; startsAt: string }, now: Date): AppointmentAction[] {
  const started = Date.parse(appt.startsAt) <= now.getTime();
  if (isLive(appt.status)) {
    return started
      ? ["missed", "reschedule", "cancel"]
      : [
          "message_booked",
          ...(appt.status === "confirmed" ? [] : (["confirm"] as const)),
          "reschedule",
          "cancel",
        ];
  }
  if (appt.status === "missed") return ["message_missed", "reschedule"];
  if (appt.status === "cancelled") return ["reschedule"];
  return [];
}

/** Status changes the PG can make, and the statuses they may start from. */
export const TRANSITIONS: Record<"confirmed" | "missed" | "cancelled" | "completed", AppointmentStatus[]> = {
  confirmed: ["scheduled", "unconfirmed"],
  missed: ["scheduled", "confirmed", "unconfirmed"],
  cancelled: ["scheduled", "confirmed", "unconfirmed"],
  // "Yes, they came" for a visit too long ago to record.
  completed: ["scheduled", "confirmed", "unconfirmed"],
};
