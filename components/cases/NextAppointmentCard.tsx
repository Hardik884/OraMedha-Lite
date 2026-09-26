import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/shared/AppointmentStatusBadge";
import { formatAppointmentWhen } from "@/lib/dates";
import { formatDuration } from "@/lib/scheduling/defaults";
import type { CaseSummary } from "@/lib/data/cases";

export function NextAppointmentCard({
  kase,
  scheduleHref,
  today,
}: {
  kase: CaseSummary;
  scheduleHref: string;
  today: string;
}) {
  const next = kase.nextAppointment;

  if (!next) {
    if (kase.status !== "ongoing") return null;
    return (
      <Link
        href={scheduleHref}
        className="flex items-center gap-3 rounded-xl border border-dashed border-warning-border bg-warning-bg p-4 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <CalendarPlus className="h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text-primary">No next appointment</p>
          <p className="text-sm text-text-secondary">Tap to schedule the next visit</p>
        </div>
      </Link>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-2 text-xs text-text-secondary">Next appointment</p>
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text-primary">{formatAppointmentWhen(next.startsAt, today)}</p>
          <p className="text-sm text-text-secondary">{formatDuration(next.durationMin)}</p>
        </div>
        <AppointmentStatusBadge status={next.status} />
      </div>
    </Card>
  );
}
