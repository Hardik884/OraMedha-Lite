import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import { getAppointment } from "@/lib/data/appointments";
import { getPreferences } from "@/lib/data/settings";
import { requirePg } from "@/lib/pg/require";
import { toManaged } from "@/lib/appointments/managed";
import { caseLabel } from "@/lib/cases/status";
import { isUuid } from "@/lib/ids";
import { formatAppointmentWhen, istToday } from "@/lib/dates";
import { formatDuration } from "@/lib/scheduling/defaults";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Appointment" };

/**
 * After booking (Schedule, New Patient step 3, Pending → Schedule) or
 * rescheduling: the appointment, and "Send to patient on WhatsApp" with the
 * booked / moved message ready.
 */
export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string; appointmentId: string }>;
  searchParams: Promise<{ rescheduled?: string; new?: string }>;
}) {
  const pg = await requirePg();
  const { patientId, appointmentId } = await params;
  const { rescheduled } = await searchParams;
  if (!isUuid(patientId) || !isUuid(appointmentId)) notFound();

  const now = new Date();
  const today = istToday(now);
  const { reminderTiming } = await getPreferences();
  const appt = await getAppointment(appointmentId, { timing: reminderTiming, now });
  if (!appt || appt.patientId !== patientId) notFound();

  const managed = toManaged(appt, pg, now);
  const moved = rescheduled === "1";
  const live = ["scheduled", "confirmed", "unconfirmed"].includes(appt.status);
  const detail = [
    appt.purpose === "review" ? "Review visit" : appt.stageName,
    appt.caseTypeName ? caseLabel(appt.tooth, appt.caseTypeName) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-lg px-4 pt-safe pb-44">
      <div className="flex flex-col items-center pt-10 pb-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success-strong">
          <CalendarCheck className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">
          {live ? (moved ? "Appointment moved" : "Appointment booked") : "Appointment"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{appt.patientName}</p>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text-primary">{formatAppointmentWhen(appt.startsAt, today)}</p>
          <p className="text-sm text-text-secondary">
            {formatDuration(appt.durationMin)}
            {detail ? ` · ${detail}` : ""}
          </p>
        </div>
        <AppointmentActions appointment={managed} nowIso={now.toISOString()} today={today} />
      </Card>

      {live && Date.parse(appt.startsAt) > now.getTime() && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-text-body">
            {moved ? "Let the patient know the new time." : "Let the patient know. The message has only the date and time, not the treatment."}
          </p>
          <SendMessageButton
            draft={moved ? managed.drafts.rescheduled : managed.drafts.booked}
            openedAt={moved ? managed.opened.rescheduled : managed.opened.booked}
          />
        </div>
      )}

      <BottomActions>
        <Button asChild size="xl" block variant="outline">
          <Link href={patientPath(patientId, { caseId: appt.caseId ?? undefined })}>Done</Link>
        </Button>
      </BottomActions>
    </main>
  );
}
