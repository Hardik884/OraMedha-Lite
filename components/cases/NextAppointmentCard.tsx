import Link from "next/link";
import { CalendarClock, CalendarDays, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import type { ManagedAppointment } from "@/lib/appointments/managed";
import { formatAppointmentWhen, formatShortDate, istDateOf } from "@/lib/dates";
import { formatDuration } from "@/lib/scheduling/defaults";
import { reschedulePath } from "@/lib/navigation/paths";
import type { CaseSummary } from "@/lib/data/cases";

/**
 * The case's next appointment (tap its status to confirm, reschedule, cancel
 * or message), or — when there isn't one — why: missed or cancelled (with
 * Reschedule), or simply not booked yet (with Schedule).
 */
export function NextAppointmentCard({
  kase,
  next,
  last,
  scheduleHref,
  today,
  nowIso,
}: {
  kase: CaseSummary;
  next: ManagedAppointment | null;
  /** The case's last appointment, when it was missed or cancelled and nothing is booked since. */
  last: ManagedAppointment | null;
  scheduleHref: string;
  today: string;
  nowIso: string;
}) {
  if (!next) {
    if (kase.status !== "ongoing") return null;
    if (last && (last.status === "missed" || last.status === "cancelled")) {
      return (
        <Card className="space-y-3 border-danger-border p-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 shrink-0 text-danger" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-text-primary">
                {last.status === "missed" ? "Missed" : "Cancelled"} on {formatShortDate(istDateOf(last.startsAt), today)}
              </p>
              <p className="text-sm text-text-secondary">Needs a new appointment</p>
            </div>
          </div>
          <Button asChild size="lg" block>
            <Link href={reschedulePath(kase.patientId, last.id)}>Reschedule</Link>
          </Button>
          {last.status === "missed" && (
            <SendMessageButton draft={last.drafts.missed} openedAt={last.opened.missed} label="Send “please call us” on WhatsApp" />
          )}
        </Card>
      );
    }
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

  const purpose = kase.nextAppointment?.purpose;
  return (
    <Card className="p-4">
      <p className="mb-2 text-xs text-text-secondary">{purpose === "review" ? "Review visit" : "Next appointment"}</p>
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text-primary">{formatAppointmentWhen(next.startsAt, today)}</p>
          <p className="text-sm text-text-secondary">{formatDuration(next.durationMin)}</p>
        </div>
        <AppointmentActions appointment={next} nowIso={nowIso} today={today} />
      </div>
    </Card>
  );
}
