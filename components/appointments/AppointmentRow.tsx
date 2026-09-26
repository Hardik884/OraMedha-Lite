import Link from "next/link";
import { Check, ClipboardPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import type { ManagedAppointment } from "@/lib/appointments/managed";
import { caseLabel } from "@/lib/cases/status";
import { formatTime } from "@/lib/dates";
import { patientPath, visitPath } from "@/lib/navigation/paths";
import type { AppointmentListItem } from "@/lib/data/appointments";

/**
 * One appointment on Today (mockup screen 1):
 *
 *   9:00 AM   Rahul Sharma        [Confirmed]
 *             46 · <case type>       [Update]
 *             <stage>
 *
 * Status and the action share a right-hand column so the name and case
 * details keep the full middle width on a narrow phone.
 *
 * Tapping the row opens the case; "Update" goes straight to Update Visit.
 * Once the visit is updated the button becomes a quiet "Updated" mark.
 * Tapping the status chip opens the appointment's actions (confirm, missed,
 * reschedule, cancel, WhatsApp).
 */
export function AppointmentRow({
  appointment: a,
  managed,
  nowIso,
  today,
}: {
  appointment: AppointmentListItem;
  managed: ManagedAppointment;
  nowIso: string;
  today: string;
}) {
  const canUpdate = a.caseId && ["scheduled", "confirmed", "unconfirmed"].includes(a.status);
  const updated = a.caseId && a.status === "completed";
  const stageLine = a.purpose === "review" ? "Review visit" : a.stageName;

  return (
    <li className="flex items-stretch">
      <Link
        href={patientPath(a.patientId, { caseId: a.caseId ?? undefined, from: "today" })}
        className="flex min-w-0 flex-1 gap-3 py-3.5 pl-4 pr-2 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="w-[4.25rem] shrink-0 pt-0.5 text-sm font-medium tabular-nums text-text-body">
          {formatTime(a.startsAt)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-text-primary">{a.patientName}</span>
          {a.caseTypeName && (
            <span className="block truncate text-sm text-text-secondary">{caseLabel(a.tooth, a.caseTypeName)}</span>
          )}
          {stageLine && <span className="block truncate text-sm text-text-body">{stageLine}</span>}
        </span>
      </Link>
      <div className="flex shrink-0 flex-col items-end justify-start gap-2 py-3.5 pr-3">
        <AppointmentActions appointment={managed} nowIso={nowIso} today={today} />
        {(canUpdate || updated) &&
          (canUpdate ? (
            <Button asChild variant="outline" size="lg" className="px-3">
              <Link href={visitPath(a.patientId, a.caseId!)} aria-label={`Update ${a.patientName}'s visit`}>
                <ClipboardPen className="h-4 w-4 text-accent" aria-hidden />
                Update
              </Link>
            </Button>
          ) : (
            <span className="flex items-center gap-1 px-1 text-sm text-success">
              <Check className="h-4 w-4" aria-hidden />
              Updated
            </span>
          ))}
      </div>
    </li>
  );
}
