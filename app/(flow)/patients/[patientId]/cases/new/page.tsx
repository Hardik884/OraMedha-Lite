import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewCaseFlow } from "@/components/cases/NewCaseFlow";
import { getCaseTypesForSpecialty } from "@/lib/data/templates";
import { getPatient } from "@/lib/data/patients";
import { requirePg } from "@/lib/pg/require";
import { isUuid } from "@/lib/ids";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "New case" };

/** Another case (e.g. a second tooth) for a patient who is already here. */
export default async function NewCasePage({ params }: { params: Promise<{ patientId: string }> }) {
  const pg = await requirePg();
  const { patientId } = await params;
  if (!isUuid(patientId)) notFound();

  const [patient, caseTypes] = await Promise.all([
    getPatient(patientId),
    getCaseTypesForSpecialty(pg.specialty.id),
  ]);
  if (!patient) notFound();

  return (
    <NewCaseFlow
      mode={{ kind: "existing-patient", patientId: patient.id, patientName: patient.fullName }}
      caseTypes={caseTypes}
      backHref={patientPath(patient.id)}
    />
  );
}
