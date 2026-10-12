import "server-only";
import webpush from "web-push";
import type { PushMessage } from "./reminder";

/**
 * Sending web push notifications (server only).
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY — identifies this app to the phone's push service
 *   VAPID_PRIVATE_KEY            — signs each notification (secret)
 *   VAPID_SUBJECT                — a contact for the push services (mailto: or https:)
 */
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushResult = "ok" | "gone" | "failed";

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** "gone" = the phone no longer accepts notifications (uninstalled, turned off): forget it. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<PushResult> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(message),
      // A reminder that arrives hours late is noise: drop it after 6 hours.
      { TTL: 6 * 60 * 60, urgency: "normal" },
    );
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    // Status only; the endpoint identifies a device, so it isn't logged.
    console.error("Push send failed", status ?? "no status");
    return "failed";
  }
}
