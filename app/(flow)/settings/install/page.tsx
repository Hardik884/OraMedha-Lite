import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { InstallGuide } from "@/components/settings/InstallGuide";
import { requirePg } from "@/lib/pg/require";

export const metadata: Metadata = { title: "Add to home screen" };

/** How to put the app on the home screen, for Android and iPhone. */
export default async function InstallPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requirePg();
  const { from } = await searchParams;
  const back = from === "reminder" ? "/settings/reminder" : "/settings";
  return (
    <>
      <FlowHeader backHref={back} backLabel="Back" title="Add to home screen" subtitle="Opens like an app, full screen" />
      <main className="mx-auto max-w-lg space-y-4 px-4 pt-5 pb-12">
        <InstallGuide />
      </main>
    </>
  );
}
