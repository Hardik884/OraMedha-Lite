import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CircleCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { AttentionRow } from "@/components/attention/AttentionRow";
import { RemindersCard, type ReminderRow } from "@/components/attention/RemindersCard";
import { TodayTabs } from "@/components/attention/TodayTabs";
import { getAppointmentsOn, getComingUp, type StatusClock } from "@/lib/data/appointments";
import { getAttention } from "@/lib/data/attention";
import { getPreferences } from "@/lib/data/settings";
import { requirePg } from "@/lib/pg/require";
import { ATTENTION_HEADINGS, ATTENTION_ORDER, attentionLines } from "@/lib/attention/build";
import { attentionRow } from "@/lib/attention/rows";
import { reminderDue } from "@/lib/appointments/timing";
import { toManaged } from "@/lib/appointments/managed";
import { draftMessage, openedAt } from "@/lib/messages/draft";
import { formatDayHeading, istToday } from "@/lib/dates";
import { NEW_PATIENT_PATH } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Today" };

// Rendered per request so the day and the list are always current.
export const dynamic = "force-dynamic";

/**
 * Today (mockup screen 1): reminders due now, who is coming and whether
 * they've confirmed, and a "Needs attention" box. Pending: everything that
 * needs an action, one tap each.
 */
export default async function TodayPage() {
  const pg = await requirePg();
  const now = new Date();
  const nowIso = now.toISOString();
  const today = istToday(now);
  const { reminderTiming } = await getPreferences();
  const clock: StatusClock = { timing: reminderTiming, now };

  const [appointments, comingUp] = await Promise.all([getAppointmentsOn(today, clock), getComingUp(clock)]);
  const attention = await getAttention(clock, comingUp);

  const reminders: ReminderRow[] = comingUp.flatMap((a) => {
    const slot = reminderDue(a, reminderTiming, now);
    if (!slot) return [];
    const draft = draftMessage("reminder", a, pg, now, slot);
    return [
      {
        appointmentId: a.id,
        patientId: a.patientId,
        caseId: a.caseId,
        patientName: a.patientName,
        startsAt: a.startsAt,
        status: a.status,
        slot,
        draft,
        openedAt: openedAt(a.messages, draft),
      },
    ];
  });

  const rows = attention.items.map((item) =>
    attentionRow(item, {
      pg,
      now,
      today,
      messages: attention.messages,
      reminderSlot: (startsAt) => reminderDue({ status: "scheduled", startsAt }, reminderTiming, now) ?? "evening",
    }),
  );

  return (
    <div className="pb-nav-action">
      <PageHeader title="Today" subtitle={formatDayHeading(now)} />

      <TodayTabs
        todayCount={appointments.length}
        pendingCount={attention.counts.total}
        lines={attentionLines(attention.counts)}
        today={
          <>
            <RemindersCard rows={reminders} />
            {appointments.length > 0 ? (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {appointments.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} managed={toManaged(a, pg, now)} nowIso={nowIso} today={today} />
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
            )}
          </>
        }
        pending={
          rows.length > 0 ? (
            ATTENTION_ORDER.filter((c) => attention.counts[c] > 0).map((category) => (
              <section key={category} data-attention={category} className="scroll-mt-24 space-y-2">
                <h2 className="text-sm font-semibold text-text-primary">
                  {ATTENTION_HEADINGS[category]}{" "}
                  <span className="font-normal text-text-secondary">({attention.counts[category]})</span>
                </h2>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-border">
                    {rows
                      .filter((r) => r.category === category)
                      .map((r) => (
                        <AttentionRow key={r.key} row={r} />
                      ))}
                  </ul>
                </Card>
              </section>
            ))
          ) : (
            <Card>
              <EmptyState
                icon={<CircleCheck />}
                title="Nothing needs attention"
                description="Every ongoing case has its next appointment booked, and every past visit is updated."
              />
            </Card>
          )
        }
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
