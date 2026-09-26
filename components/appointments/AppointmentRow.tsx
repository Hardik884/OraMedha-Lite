import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/shared/AppointmentStatusBadge";
import { caseLabel } from "@/lib/cases/status";
import { formatTime } from "@/lib/dates";
import { patientPath } from "@/lib/navigation/paths";
import type { AppointmentListItem } from "@/lib/data/appointments";

/**
 * One appointment on Today (mockup screen 1):
 *
 *   9:00 AM   Rahul Sharma            [Confirmed]
 *             46 · <case type>
 *             <stage>
 *
 * The status sits on the name line so the case details below get the full
 * width instead of being cut off. One tap opens the case.
 */
export function AppointmentRow({ appointment: a }: { appointment: AppointmentListItem }) {
  return (
    <li>
      <Link
        href={patientPath(a.patientId, { caseId: a.caseId ?? undefined, from: "today" })}
        className="flex gap-3 px-4 py-3.5 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="w-[4.25rem] shrink-0 pt-0.5 text-sm font-medium tabular-nums text-text-body">
          {formatTime(a.startsAt)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-base font-semibold text-text-primary">{a.patientName}</span>
            <AppointmentStatusBadge status={a.status} className="mt-0.5 shrink-0" />
          </span>
          {a.caseTypeName && (
            <span className="block truncate text-sm text-text-secondary">
              {caseLabel(a.tooth, a.caseTypeName)}
            </span>
          )}
          {a.stageName && <span className="block truncate text-sm text-text-body">{a.stageName}</span>}
        </span>
      </Link>
    </li>
  );
}
