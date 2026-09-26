import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarCheck, CalendarClock, CircleCheck, ClipboardList, Flag, History, type LucideIcon } from "lucide-react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getVisitContext } from "@/lib/data/visit";
import { getVisitFileIds } from "@/lib/data/files";
import { VisitFilesRow } from "@/components/files/VisitFilesRow";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { formatAppointmentWhen, formatWeekdayDate, isIsoDate } from "@/lib/dates";
import { getAppointment } from "@/lib/data/appointments";
import { getPreferences } from "@/lib/data/settings";
import { toManaged } from "@/lib/appointments/managed";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import { formatDuration } from "@/lib/scheduling/defaults";
import { patientPath, schedulePath, visitPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Visit updated" };

function Row({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-text-primary">{title}</span>
        {detail && <span className="block text-sm text-text-secondary">{detail}</span>}
      </span>
      <CircleCheck className="mt-2 h-5 w-5 shrink-0 text-success" aria-label="Done" />
    </li>
  );
}

/**
 * Visit Updated (mockup 5). Every line is read back from the database, so it
 * lists only what actually happened — no promises about messages or
 * reminders that don't exist yet.
 */
export default async function VisitUpdatedPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string; caseId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const pg = await requirePg();
  const { patientId, caseId } = await params;
  const { date } = await searchParams;
  if (!isUuid(patientId) || !isUuid(caseId)) notFound();
  const visitDate = date && isIsoDate(date) ? date : undefined;

  const ctx = await getVisitContext(caseId, visitDate);
  if (!ctx || ctx.kase.patientId !== patientId) notFound();
  const visit = ctx.todayVisit;
  // Nothing recorded today (e.g. opened from history): go back to the case.
  if (!visit || visit.outcome === null) redirect(patientPath(patientId, { caseId }));

  const { kase, today, template } = ctx;
  const stageName = (id: string) => template.stages.find((s) => s.id === id)?.name ?? "";
  const worked = [...visit.stageIds]
    .sort((a, b) => (template.stages.find((s) => s.id === a)?.sortOrder ?? 0) - (template.stages.find((s) => s.id === b)?.sortOrder ?? 0))
    .map(stageName);
  // Files are filed under the furthest stage worked on (see the case_files migration).
  const filedUnder = worked.length > 0 ? worked[worked.length - 1]! : null;
  if (visit.otherWork) worked.push(visit.otherWork);
  const modifier = template.modifiers.find((m) => m.id === visit.modifierId);
  const completed = kase.status === "completed";
  const next = visit.nextAppointment && visit.nextAppointment.status !== "cancelled" ? visit.nextAppointment : null;
  const now = new Date();
  const { reminderTiming } = await getPreferences();
  const [fileIds, nextAppt] = await Promise.all([
    getVisitFileIds(visit.id),
    next ? getAppointment(next.id, { timing: reminderTiming, now }) : Promise.resolve(null),
  ]);
  const managedNext = nextAppt ? toManaged(nextAppt, pg, now) : null;
  const isPastDay = ctx.visitDate !== today;

  return (
    <main className="mx-auto max-w-lg px-4 pt-safe pb-44">
      <div className="flex flex-col items-center pt-10 pb-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
          <CircleCheck className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">
          {completed ? "Case completed" : "Visit updated"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {kase.patientName}
          {kase.tooth ? ` · ${kase.tooth}` : ""} · {kase.caseTypeName}
        </p>
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          <Row
            icon={ClipboardList}
            title={isPastDay ? `Visit of ${formatWeekdayDate(ctx.visitDate, today)} recorded` : "Today's visit recorded"}
            detail={`${worked.join(" + ")} · ${visit.outcome === "complete" ? "Complete" : "Partial"}${
              modifier ? ` · ${modifier.label}` : ""
            }`}
          />
          <Row icon={History} title="Case timeline updated" />
          <VisitFilesRow
            patientId={patientId}
            caseId={caseId}
            visitId={visit.id}
            savedIds={fileIds}
            stageName={filedUnder ? `Filed under ${filedUnder}` : null}
          />
          {visit.completedAppointment && (
            <Row
              icon={CalendarCheck}
              title={isPastDay ? "The appointment marked completed" : "Today's appointment marked completed"}
              detail={formatAppointmentWhen(visit.completedAppointment.startsAt, today)}
            />
          )}
          {completed ? (
            <Row icon={Flag} title="Case marked complete" detail="No more treatment visits. The timeline is kept." />
          ) : (
            <Row icon={Flag} title="Current stage updated" detail={`Next: ${kase.currentStageName ?? ""}`} />
          )}
          {next ? (
            <Row
              icon={CalendarClock}
              title={next.purpose === "review" ? "Review visit booked" : "Next appointment booked"}
              detail={`${formatAppointmentWhen(next.startsAt, today)} · ${formatDuration(next.durationMin)}`}
            />
          ) : (
            !completed && (
              <li className="flex items-start gap-3 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-bg text-warning">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-text-primary">Next appointment not booked yet</span>
                  <span className="block text-sm text-text-secondary">It&apos;s listed under Pending on Today.</span>
                </span>
              </li>
            )
          )}
        </ul>
      </Card>

      {managedNext && Date.parse(managedNext.startsAt) > now.getTime() && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-text-body">
            Tell {kase.patientName} about the {next?.purpose === "review" ? "review visit" : "next appointment"}.
          </p>
          <SendMessageButton draft={managedNext.drafts.booked} openedAt={managedNext.opened.booked} />
        </div>
      )}

      <BottomActions>
        <Button asChild size="xl" block>
          <Link href="/today">Done</Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="lg">
            <Link href={patientPath(patientId, { caseId })}>View case</Link>
          </Button>
          {!next && !completed ? (
            <Button asChild variant="outline" size="lg">
              <Link href={schedulePath(patientId, caseId)}>Schedule now</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href={visitPath(patientId, caseId, { date: isPastDay ? ctx.visitDate : undefined })}>Edit visit</Link>
            </Button>
          )}
        </div>
      </BottomActions>
    </main>
  );
}
