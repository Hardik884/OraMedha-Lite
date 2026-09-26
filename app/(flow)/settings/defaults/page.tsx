import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { getStageDefaults } from "@/lib/data/settings";
import { StageDefaults } from "./StageDefaults";

export const metadata: Metadata = { title: "My clinical defaults" };

export default async function DefaultsPage() {
  const pg = await requirePg();
  const caseTypes = await getStageDefaults(pg.specialty.id);
  return (
    <>
      <FlowHeader
        backHref="/settings"
        backLabel="Back to Settings"
        title="Durations and gaps"
        subtitle={pg.specialty.name}
      />
      <StageDefaults caseTypes={caseTypes} />
    </>
  );
}
