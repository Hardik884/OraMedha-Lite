import type { Metadata } from "next";
import { NewCaseFlow } from "@/components/cases/NewCaseFlow";
import { getCaseTypesForSpecialty } from "@/lib/data/templates";
import { requirePg } from "@/lib/pg/require";

export const metadata: Metadata = { title: "New patient" };

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const pg = await requirePg();
  const { from } = await searchParams;
  // Case types of the PG's own specialty, straight from the templates.
  const caseTypes = await getCaseTypesForSpecialty(pg.specialty.id);

  return (
    <NewCaseFlow
      mode={{ kind: "new-patient" }}
      caseTypes={caseTypes}
      backHref={from === "patients" ? "/patients" : "/today"}
    />
  );
}
