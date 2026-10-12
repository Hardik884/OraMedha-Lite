"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { isWrapUpReminderTime, testPushMessage } from "@/lib/push/reminder";
import { pushConfigured, sendPush } from "@/lib/push/send";
import { APP_NAME } from "@/lib/brand/name";

export type ReminderResult = { ok: true; sent?: number } | { ok: false; error: string };

const FAILED = "Couldn't save. Check your internet and try again.";

/** The evening reminder time, or null to turn it off. */
export async function saveReminderTime(time: string | null): Promise<ReminderResult> {
  if (time !== null && !isWrapUpReminderTime(time)) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: FAILED };
  const { error } = await supabase
    .from("pg_preferences")
    .update({ wrap_up_reminder_time: time })
    .eq("pg_id", user.id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath("/settings");
  return { ok: true };
}

/** This phone allowed notifications: remember it (moves it from another PG if it was theirs). */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ReminderResult> {
  const valid =
    typeof input.endpoint === "string" &&
    input.endpoint.startsWith("https://") &&
    input.endpoint.length <= 2000 &&
    typeof input.p256dh === "string" &&
    input.p256dh.length > 0 &&
    input.p256dh.length <= 200 &&
    typeof input.auth === "string" &&
    input.auth.length > 0 &&
    input.auth.length <= 100;
  if (!valid) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
    p_user_agent: typeof input.userAgent === "string" ? input.userAgent.slice(0, 400) : undefined,
  });
  if (error) return { ok: false, error: FAILED };
  revalidatePath("/settings/reminder");
  return { ok: true };
}

/** This phone turned notifications off: forget it. */
export async function removePushSubscription(endpoint: string): Promise<ReminderResult> {
  if (typeof endpoint !== "string" || endpoint.length > 2000) return { ok: false, error: FAILED };
  const supabase = await createServerClient();
  const { error } = await supabase.from("push_subscription").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: FAILED };
  revalidatePath("/settings/reminder");
  return { ok: true };
}

/** "Send a test notification" — to every phone this PG has turned on. */
export async function sendTestNotification(): Promise<ReminderResult> {
  if (!pushConfigured()) return { ok: false, error: "Notifications aren't set up on the server yet." };
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("push_subscription").select("endpoint, p256dh, auth");
  if (error) return { ok: false, error: FAILED };
  if (!data || data.length === 0) return { ok: false, error: "Turn on notifications on this phone first." };
  let sent = 0;
  for (const target of data) {
    const result = await sendPush(target, testPushMessage(APP_NAME));
    if (result === "ok") sent += 1;
    // A phone that has gone away is forgotten right here.
    if (result === "gone") await supabase.from("push_subscription").delete().eq("endpoint", target.endpoint);
  }
  return sent > 0 ? { ok: true, sent } : { ok: false, error: "Couldn't reach this phone. Turn notifications off and on again." };
}
