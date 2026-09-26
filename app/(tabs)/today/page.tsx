import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CircleCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { PendingCaseRow } from "@/components/cases/PendingCaseRow";
import { getAppointmentsOn } from "@/lib/data/appointments";
import { getCasesNeedingAppointment } from "@/lib/data/cases";
import { formatDayHeading, istToday } from "@/lib/dates";
import { NEW_PATIENT_PATH } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Today" };

// Rendered per request so the day and the list are always current.
export const dynamic = "force-dynamic";

/**
 * Today (mockup screen 1): who is coming, what you're doing with them, and
 * whether they've confirmed. Pending: only things that need action.
 */
export default async function TodayPage() {
  const now = new Date();
  const [appointments, pending] = await Promise.all([
    getAppointmentsOn(istToday(now)),
    getCasesNeedingAppointment(),
  ]);

  return (
    <div className="pb-nav-action">
      <PageHeader title="Today" subtitle={formatDayHeading(now)} />

      <SegmentedTabs
        tabs={[
          { key: "today", label: "Today", count: appointments.length },
          { key: "pending", label: "Pending", count: pending.length },
        ]}
        panels={{
          today:
            appointments.length > 0 ? (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {appointments.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} />
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={<CalendarDays />}
                  title="No appointments today"
                  description="Patients you book for today will show here, with what you're doing and whether they've confirmed."
                />
              </Card>
            ),
          pending:
            pending.length > 0 ? (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {pending.map((c) => (
                    <PendingCaseRow key={c.caseId} kase={c} />
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={<CircleCheck />}
                  title="Nothing pending"
                  description="Every ongoing case has its next appointment booked."
                />
              </Card>
            ),
        }}
      />

      <BottomActions aboveNav>
        <Button asChild size="xl" block className="shadow-md">
          <Link href={NEW_PATIENT_PATH}>
            <Plus className="h-5 w-5" aria-hidden />
            New Patient
          </Link>
        </Button>
      </BottomActions>
    </div>
  );
}
