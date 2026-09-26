import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS_LABELS,
  getAppointmentStatusVariant,
  type AppointmentStatus,
} from "@/lib/appointments/status";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

/** Appointment status chip — Confirmed, Unconfirmed, Missed… */
export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  return (
    <Badge variant={getAppointmentStatusVariant(status)} className={className}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
