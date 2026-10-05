import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WrapUpList, type WrapUpRow } from "@/components/wrapup/WrapUpList";
import { getAppointmentsOn, getNextForCases, getNeverUpdated, type StatusClock } from "@/lib/data/appointments";
import { getPreferences } from "@/lib/data/settings";
import { requirePg } from "@/lib/pg/require";
import { planWrapUp } from "@/lib/wrapup/plan";
import { toManaged } from "@/lib/appointments/managed";
import { caseLabel } from "@/lib/cases/status";
import { formatDayHeading, istToday } from "@/lib/dates";
import { reschedulePath, schedulePath, visitPath } from "@/lib/navigation/paths";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Wrap up the day" };
export const dynamic = "force-dynamic";

/**
 * Wrap up the day: everyone booked for today in one list, answered once —
 * "Came" (what was done and the next appointment, in one pass) or "Didn't
 * come". After each save the PG lands back here, on the next patient. The
 * WhatsApp messages (the new time, or "please call us") are one tap each
 * from the same list.
 */
export default async function WrapUpPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const pg = await requirePg();
  const { saved } = await searchParams;
  const now = new Date();
  const today = istToday(now);
  const { reminderTiming } = await getPreferences();
  const clock: StatusClock = { timing: reminderTiming, now };

  const [appointments, olderOpen] = await Promise.all([getAppointmentsOn(today, clock), getNeverUpdated(clock)]);
  const plan = planWrapUp(appointments, now);
  const cameCases = plan.items.flatMap((i) => (i.state === "came" && i.appointment.caseId ? [i.appointment.caseId] : []));
  const nextByCase = await getNextForCases(cameCases, clock);

  const rows: WrapUpRow[] = plan.items.map(({ appointment: a, state, action }) => {
    const base = {
      id: a.id,
      patientName: a.patientName,
      startsAt: a.startsAt,
      detail: [a.caseTypeName ? caseLabel(a.tooth, a.caseTypeName) : null, a.purpose === "review" ? "Review visit" : a.stageName]
        .filter(Boolean)
        .join(" · "),
      state,
      action,
      visitHref: a.caseId ? visitPath(a.patientId, a.caseId, { then: "wrap-up" }) : null,
      justSaved: saved !== undefined && isUuid(saved) && a.caseId === saved,
    };
    if (state === "missed") {
      const m = toManaged(a, pg, now);
      return {
        ...base,
        message: { draft: m.drafts.missed, openedAt: m.opened.missed, label: "Ask them to call you" },
        follow: { href: reschedulePath(a.patientId, a.id), label: "Book again" },
      };
    }
    if (state === "came" && a.caseId && a.caseStatus === "ongoing") {
      const next = nextByCase.get(a.caseId);
      if (next) {
        const m = toManaged(next, pg, now);
        return { ...base, nextAt: next.startsAt, message: { draft: m.drafts.booked, openedAt: m.opened.booked, label: "Send the next appointment" } };
      }
      return { ...base, follow: { href: schedulePath(a.patientId, a.caseId), label: "Book next" } };
    }
    return base;
  });

  const olderCount = olderOpen.length;

  return (
    <>
      <FlowHeader backHref="/today" title="Wrap up the day" subtitle={formatDayHeading(now)} />
      <main className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-12">
        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarDays />}
              title="No appointments today"
              description="Saw someone without an appointment? Open them from Patients and tap Update Visit."
            />
          </Card>
        ) : (
          <WrapUpList rows={rows} toUpdate={plan.toUpdate} done={plan.done} total={plan.items.length} today={today} />
        )}

        {olderCount > 0 && (
          <Link
            href="/today?tab=pending"
            className="flex items-center gap-3 rounded-xl border border-warning-border bg-warning-bg/60 p-4 text-sm text-text-body active:bg-warning-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="flex-1">
              {olderCount === 1 ? "1 appointment" : `${olderCount} appointments`} from earlier days still not updated
            </span>
            <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden />
          </Link>
        )}
      </main>
    </>
  );
}
