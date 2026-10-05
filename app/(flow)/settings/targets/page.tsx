import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { getProgressCases, getSpecialTargets, getSpecialtiesAndCaseTypes, getTargets } from "@/lib/data/progress";
import { TargetsForm } from "./TargetsForm";

export const metadata: Metadata = { title: "Targets" };

/** Optional targets per case type and for special cases, shown on Progress as "8 / 10". */
export default async function TargetsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const pg = await requirePg();
  const { from } = await searchParams;
  const [{ specialties, caseTypes }, cases, targets, specialTargets] = await Promise.all([
    getSpecialtiesAndCaseTypes(),
    getProgressCases(),
    getTargets(),
    getSpecialTargets(),
  ]);
  const specialtyIds = new Set([pg.specialty.id, ...cases.map((c) => c.specialtyId)]);
  const groups = specialties
    .filter((s) => specialtyIds.has(s.id))
    .sort((a, b) => Number(b.id === pg.specialty.id) - Number(a.id === pg.specialty.id))
    .map((s) => ({
      specialtyId: s.id,
      specialty: s.name,
      specialTarget: specialTargets[s.id] ?? null,
      caseTypes: caseTypes.filter((t) => t.specialtyId === s.id).map((t) => ({ id: t.id, name: t.name, target: targets[t.id] ?? null })),
    }));
  const back = from === "progress" ? "/progress" : "/settings";
  return (
    <>
      <FlowHeader backHref={back} backLabel="Back" title="Targets" subtitle="Optional · per case type, and special cases" />
      <TargetsForm groups={groups} doneHref={back} />
    </>
  );
}
