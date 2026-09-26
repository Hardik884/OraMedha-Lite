import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { createServerClient } from "@/lib/supabase/server";
import { cleanScreen } from "@/lib/feedback/screen";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = { title: "Send feedback" };

/** A short note to the OraMedha team, with the screen it came from. */
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requirePg();
  const { from } = await searchParams;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("feedback")
    .select("id, message, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  const back = `/settings${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  return (
    <>
      <FlowHeader backHref={back} backLabel="Back to Settings" title="Send feedback" />
      <FeedbackForm
        screen={cleanScreen(from)}
        sent={(data ?? []).map((f) => ({ id: f.id, message: f.message, at: f.created_at }))}
      />
    </>
  );
}
