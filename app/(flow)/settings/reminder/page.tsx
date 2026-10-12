import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { ReminderSettings } from "@/components/settings/ReminderSettings";
import { requirePg } from "@/lib/pg/require";
import { createServerClient } from "@/lib/supabase/server";
import { reminderTimeFromDb } from "@/lib/push/reminder";

export const metadata: Metadata = { title: "Wrap-up reminder" };
export const dynamic = "force-dynamic";

/** The evening wrap-up reminder: time, and notifications on this phone. */
export default async function ReminderPage() {
  const pg = await requirePg();
  const supabase = await createServerClient();
  const [prefs, subs] = await Promise.all([
    supabase.from("pg_preferences").select("wrap_up_reminder_time").eq("pg_id", pg.id).maybeSingle(),
    supabase.from("push_subscription").select("endpoint"),
  ]);
  if (prefs.error) throw new Error(`Could not load preferences: ${prefs.error.code}`);
  if (subs.error) throw new Error(`Could not load phones: ${subs.error.code}`);
  return (
    <>
      <FlowHeader backHref="/settings" backLabel="Back to Settings" title="Wrap-up reminder" subtitle="A nudge after clinic" />
      <main className="mx-auto max-w-lg px-4 pt-5 pb-12">
        <ReminderSettings
          initialTime={reminderTimeFromDb(prefs.data?.wrap_up_reminder_time)}
          savedEndpoints={subs.data.map((s) => s.endpoint)}
          publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null}
        />
      </main>
    </>
  );
}
