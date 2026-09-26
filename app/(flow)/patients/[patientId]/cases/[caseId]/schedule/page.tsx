import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScheduleForm } from "@/components/appointments/ScheduleForm";
import { getCase } from "@/lib/data/cases";
import { getStageDefaults } from "@/lib/data/templates";
import { getWorkingHours } from "@/lib/data/preferences";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { istToday } from "@/lib/dates";
import { defaultNextVisit } from "@/lib/scheduling/defaults";

export const metadata: Metadata = { title: "Schedule" };

/** Default when a case has no current stage to take a duration from. */
const FALLBACK_DURATION_MIN = 30;

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

  const kase = await getCase(caseId);
  if (!kase || kase.patientId !== patientId) notFound();

  const [stage, workingHours] = await Promise.all([
    kase.currentStageId ? getStageDefaults(kase.currentStageId) : Promise.resolve(null),
    getWorkingHours(),
  ]);

  const today = istToday();
  const suggested = defaultNextVisit({
    today,
    gapMinDays: stage?.gapMinDays ?? null,
    workingHours,
  });

  return (
    <ScheduleForm
      patientId={patientId}
      caseId={caseId}
      patientName={kase.patientName}
      caseTypeName={kase.caseTypeName}
      tooth={kase.tooth}
      stageName={kase.currentStageName}
      today={today}
      defaults={{
        date: suggested.date,
        time: suggested.time,
        durationMin: stage?.durationMin ?? FALLBACK_DURATION_MIN,
      }}
      existingNextAt={kase.nextAppointment?.startsAt ?? null}
      isNew={isNew === "1"}
    />
  );
}
