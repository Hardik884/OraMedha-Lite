import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScheduleForm } from "@/components/appointments/ScheduleForm";
import { getLastUpdatedVisit, getVisitContext } from "@/lib/data/visit";
import { getSchedulingData } from "@/lib/data/scheduling";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { formatRelativeDay } from "@/lib/dates";
import { effectiveStageDuration } from "@/lib/engine/next-step";
import { windowForCase } from "@/lib/scheduling/window";

export const metadata: Metadata = { title: "Schedule" };

/** Default when a case has no current stage to take a duration from. */
const FALLBACK_DURATION_MIN = 30;

/**
 * "Schedule the next appointment" — step 3 of New Patient, and Schedule from
 * Pending or the Patient screen. The slot finder suggests the first free slot
 * in the case's usual window.
 */
export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string; caseId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  await requirePg();
  const { patientId, caseId } = await params;
  const { new: isNew } = await searchParams;
  if (!isUuid(patientId) || !isUuid(caseId)) notFound();

  const [ctx, scheduling, lastVisit] = await Promise.all([
    getVisitContext(caseId),
    getSchedulingData(),
    getLastUpdatedVisit(caseId),
  ]);
  if (!ctx || ctx.kase.patientId !== patientId) notFound();
  const { kase, template, overrides, today } = ctx;

  const window = windowForCase({
    template,
    overrides,
    lastVisit: kase.status === "ongoing" ? lastVisit : null,
    currentStageId: kase.status === "ongoing" ? kase.currentStageId : null,
    today,
  });
  const stage = template.stages.find((s) => s.id === kase.currentStageId);
  const durationMin =
    stage && kase.status === "ongoing"
      ? effectiveStageDuration(stage, overrides.stages).durationMin
      : FALLBACK_DURATION_MIN;

  return (
    <ScheduleForm
      patientId={patientId}
      caseId={caseId}
      patientName={kase.patientName}
      caseTypeName={kase.caseTypeName}
      tooth={kase.tooth}
      stageName={kase.status === "ongoing" ? kase.currentStageName : "Review visit"}
      today={today}
      nowIso={new Date().toISOString()}
      scheduling={scheduling}
      window={{ from: window.from, to: window.to }}
      windowLabel={
        window.usual
          ? `Usual window: ${formatRelativeDay(window.from, today)} – ${formatRelativeDay(window.to, today)}`
          : undefined
      }
      defaultDurationMin={durationMin}
      existingNextAt={kase.nextAppointment?.startsAt ?? null}
      isNew={isNew === "1"}
    />
  );
}
