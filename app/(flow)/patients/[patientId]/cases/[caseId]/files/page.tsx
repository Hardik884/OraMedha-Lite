import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilesScreen } from "@/components/files/FilesScreen";
import { getCase } from "@/lib/data/cases";
import { getCaseFiles } from "@/lib/data/files";
import { getStageNames } from "@/lib/data/templates";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { istToday } from "@/lib/dates";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Files" };

/** Files within a case (mockup screen 8). `?file=<id>` opens one straight away. */
export default async function FilesPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string; caseId: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  await requirePg();
  const { patientId, caseId } = await params;
  const { file } = await searchParams;
  if (!isUuid(patientId) || !isUuid(caseId)) notFound();

  const kase = await getCase(caseId);
  if (!kase || kase.patientId !== patientId) notFound();
  const [files, stageNames] = await Promise.all([
    getCaseFiles(caseId),
    getStageNames(kase.caseTypeId, kase.status === "ongoing" ? kase.currentStageName : null),
  ]);

  return (
    <FilesScreen
      patientId={patientId}
      caseId={caseId}
      title={`${kase.patientName} · Files`}
      subtitle={[kase.caseTypeName, kase.tooth ? `Tooth ${kase.tooth}` : null].filter(Boolean).join(" · ")}
      backHref={patientPath(patientId, { caseId })}
      files={files}
      today={istToday()}
      stageNames={stageNames}
      initialFileId={file && isUuid(file) ? file : null}
    />
  );
}
