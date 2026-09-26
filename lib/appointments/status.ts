import type { BadgeVariant } from "@/components/ui/badge";

/**
 * Appointment statuses for v0.1 (see CLAUDE.md → Scheduling).
 *
 * A cancelled appointment puts the patient into "reschedule pending"; that is
 * a property of the patient/case, not a separate appointment status.
 */
export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "unconfirmed",
  "cancelled",
  "missed",
  "completed",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  unconfirmed: "Unconfirmed",
  cancelled: "Cancelled",
  missed: "Missed",
  completed: "Completed",
};

/**
 * Colour meaning follows design-system.md: success = Confirmed/Completed,
 * warning = Unconfirmed/Pending, danger = Missed/Cancelled, neutral otherwise.
 */
const STATUS_VARIANTS: Record<AppointmentStatus, BadgeVariant> = {
  scheduled: "secondary",
  confirmed: "success",
  unconfirmed: "warning",
  cancelled: "danger",
  missed: "danger",
  completed: "success",
};

export function getAppointmentStatusVariant(status: AppointmentStatus): BadgeVariant {
  return STATUS_VARIANTS[status];
}
