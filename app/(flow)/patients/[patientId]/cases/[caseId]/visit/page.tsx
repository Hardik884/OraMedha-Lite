import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UpdateVisitFlow } from "@/components/visits/UpdateVisitFlow";
import { getVisitContext } from "@/lib/data/visit";
import { getSchedulingData } from "@/lib/data/scheduling";
import { getCaseFiles } from "@/lib/data/files";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { isVisitReturn, patientPath, wrapUpPath } from "@/lib/navigation/paths";
import { formatWeekdayDate, isIsoDate, istToday } from "@/lib/dates";
import { canRecordVisitOn } from "@/lib/visits/backdate";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { MarkAttendedButton } from "@/components/attention/MarkAttendedButton";

export const metadata: Metadata = { title: "Update visit" };

/**
 * Update Visit. `?date=YYYY-MM-DD` records a forgotten visit from an earlier
 * day (up to 7 days back), from "Did they come? → Yes, update visit".
 */
export default async function UpdateVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string; caseId: string }>;
  searchParams: Promise<{ date?: string; then?: string }>;
}) {
  await requirePg();
  const { patientId, caseId } = await params;
  const { date, then } = await searchParams;
  const returnTo = isVisitReturn(then) ? then : undefined;
  if (!isUuid(patientId) || !isUuid(caseId)) notFound();
  const today = istToday();
  const visitDate = date && isIsoDate(date) ? date : today;
  if (!canRecordVisitOn(visitDate, today)) notFound();

  const [ctx, scheduling, files] = await Promise.all([
    getVisitContext(caseId, visitDate),
    getSchedulingData(),
    getCaseFiles(caseId),
  ]);
  if (!ctx || ctx.kase.patientId !== patientId) notFound();

  const { kase } = ctx;
  const backHref = returnTo === "wrap-up" ? wrapUpPath() : patientPath(patientId, { caseId });

  // An older visit can't be slotted in after a newer one.
  if (visitDate !== today && ctx.hasLaterVisit && !ctx.todayVisit) {
    return (
      <>
        <FlowHeader backHref={backHref} title={kase.patientName} subtitle={kase.caseTypeName} />
        <main className="mx-auto max-w-lg space-y-4 px-4 pt-6">
          <h1 className="text-xl font-semibold text-text-primary">A later visit is already recorded</h1>
          <p className="text-sm text-text-body">
            The visit of {formatWeekdayDate(visitDate, today)} can&apos;t be added before it. If the patient came that
            day, mark the appointment as attended.
          </p>
          {ctx.todaysAppointment && <MarkAttendedButton appointmentId={ctx.todaysAppointment.id} doneHref={returnTo ? wrapUpPath() : "/today"} />}
        </main>
      </>
    );
  }

  return (
    <UpdateVisitFlow
      patientId={patientId}
      caseId={caseId}
      title={kase.tooth ? `${kase.patientName} · ${kase.tooth}` : kase.patientName}
      subtitle={kase.caseTypeName}
      template={ctx.template}
      overrides={ctx.overrides}
      scheduling={scheduling}
      nowIso={new Date().toISOString()}
      today={ctx.today}
      visitDate={ctx.visitDate}
      currentStageId={kase.currentStageId}
      todayVisit={ctx.todayVisit}
      todaysAppointmentAt={ctx.todaysAppointment?.startsAt ?? null}
      upcomingAppointment={ctx.upcomingAppointment}
      todayFiles={ctx.todayVisit ? files.filter((f) => f.visitId === ctx.todayVisit!.id) : []}
      backHref={backHref}
      then={returnTo}
    />
  );
}
