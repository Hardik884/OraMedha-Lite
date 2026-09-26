import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { getPreferences } from "@/lib/data/settings";
import { TimingsForm } from "./TimingsForm";

export const metadata: Metadata = { title: "Clinic timings" };

export default async function TimingsPage() {
  await requirePg();
  const prefs = await getPreferences();
  return (
    <>
      <FlowHeader backHref="/settings" backLabel="Back to Settings" title="Clinic timings" />
      <TimingsForm initial={prefs.workingHours} initialSlotStep={prefs.slotStepMin} />
    </>
  );
}
