import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UpdateVisitFlow } from "@/components/visits/UpdateVisitFlow";
import { getVisitContext } from "@/lib/data/visit";
import { getSchedulingData } from "@/lib/data/scheduling";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Update visit" };

export default async function UpdateVisitPage({
  params,
}: {
  params: Promise<{ patientId: string; caseId: string }>;
}) {
  await requirePg();
  const { patientId, caseId } = await params;
  if (!isUuid(patientId) || !isUuid(caseId)) notFound();

  const [ctx, scheduling] = await Promise.all([getVisitContext(caseId), getSchedulingData()]);
  if (!ctx || ctx.kase.patientId !== patientId) notFound();

  const { kase } = ctx;
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
      currentStageId={kase.currentStageId}
      todayVisit={ctx.todayVisit}
      todaysAppointmentAt={ctx.todaysAppointment?.startsAt ?? null}
      upcomingAppointment={ctx.upcomingAppointment}
      backHref={patientPath(patientId, { caseId })}
    />
  );
}
