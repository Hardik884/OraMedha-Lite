import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { getBlockedTimes } from "@/lib/data/settings";
import { isCurrentBlock } from "@/lib/settings/blocked";
import { istToday } from "@/lib/dates";
import { BlockedTimes } from "./BlockedTimes";

export const metadata: Metadata = { title: "Blocked times" };

export default async function BlockedTimesPage() {
  await requirePg();
  const now = new Date();
  // Past one-off blocks are kept in the database but not listed.
  const blocks = (await getBlockedTimes()).filter((b) => isCurrentBlock(b, now));
  return (
    <>
      <FlowHeader backHref="/settings" backLabel="Back to Settings" title="Blocked times" />
      <BlockedTimes blocks={blocks} today={istToday(now)} />
    </>
  );
}
