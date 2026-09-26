import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RescheduleForm } from "@/components/appointments/RescheduleForm";
import { getAppointment } from "@/lib/data/appointments";
import { getSchedulingData } from "@/lib/data/scheduling";
import { getPreferences } from "@/lib/data/settings";
import { getLastUpdatedVisit, getVisitContext } from "@/lib/data/visit";
import { requirePg } from "@/lib/pg/require";
import { isLive } from "@/lib/appointments/timing";
import { caseLabel } from "@/lib/cases/status";
import { isUuid } from "@/lib/ids";
import { formatRelativeDay, istToday } from "@/lib/dates";
import { windowForCase, windowFromGap } from "@/lib/scheduling/window";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Reschedule" };

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ patientId: string; appointmentId: string }>;
}) {
  await requirePg();
  const { patientId, appointmentId } = await params;
  if (!isUuid(patientId) || !isUuid(appointmentId)) notFound();

  const now = new Date();
  const today = istToday(now);
  const { reminderTiming } = await getPreferences();
  const appt = await getAppointment(appointmentId, { timing: reminderTiming, now });
  if (!appt || appt.patientId !== patientId) notFound();
  if (!isLive(appt.storedStatus) && appt.storedStatus !== "missed" && appt.storedStatus !== "cancelled") notFound();

  const [scheduling, ctx, lastVisit] = await Promise.all([
    getSchedulingData(),
    appt.caseId ? getVisitContext(appt.caseId) : Promise.resolve(null),
    appt.caseId ? getLastUpdatedVisit(appt.caseId) : Promise.resolve(null),
  ]);

  // The case's usual window when it's known; otherwise the next two weeks.
  const window =
    ctx && ctx.kase.status === "ongoing" && appt.purpose === "treatment"
      ? windowForCase({
          template: ctx.template,
          overrides: ctx.overrides,
          lastVisit,
          currentStageId: ctx.kase.currentStageId,
          today,
        })
      : windowFromGap(today, null, today);

  const backHref = patientPath(patientId, { caseId: appt.caseId ?? undefined });
  return (
    <RescheduleForm
      patientId={patientId}
      appointmentId={appointmentId}
      title={appt.patientName}
      subtitle={[appt.caseTypeName ? caseLabel(appt.tooth, appt.caseTypeName) : null, appt.purpose === "review" ? "Review visit" : appt.stageName]
        .filter(Boolean)
        .join(" · ")}
      currentStartsAt={appt.startsAt}
      currentStatus={isLive(appt.storedStatus) ? "live" : (appt.storedStatus as "missed" | "cancelled")}
      today={today}
      nowIso={now.toISOString()}
      scheduling={scheduling}
      window={{ from: window.from, to: window.to }}
      windowLabel={
        window.usual ? `Usual window: ${formatRelativeDay(window.from, today)} – ${formatRelativeDay(window.to, today)}` : undefined
      }
      durationMin={appt.durationMin}
      backHref={backHref}
    />
  );
}
