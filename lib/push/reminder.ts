/**
 * The evening wrap-up reminder: a push notification at a time the PG picks,
 * only on days when some of today's patients are still waiting to be wrapped
 * up. It never names a patient — the lock screen is not private.
 */
export const WRAP_UP_REMINDER_TIMES = ["17:00", "18:00", "19:00", "20:00", "21:00"] as const;
export type WrapUpReminderTime = (typeof WRAP_UP_REMINDER_TIMES)[number];

export function isWrapUpReminderTime(value: unknown): value is WrapUpReminderTime {
  return typeof value === "string" && (WRAP_UP_REMINDER_TIMES as readonly string[]).includes(value);
}

/** "19:00" (or "19:00:00" from the database) → "7 PM". */
export function formatReminderTime(time: string): string {
  const [h = "0", m = "0"] = time.split(":");
  const hour = Number(h);
  const minute = Number(m);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return minute === 0 ? `${h12} ${suffix}` : `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** The database stores "19:00:00"; the app uses "19:00". */
export function reminderTimeFromDb(value: string | null | undefined): WrapUpReminderTime | null {
  if (!value) return null;
  const hhmm = value.slice(0, 5);
  return isWrapUpReminderTime(hhmm) ? hhmm : null;
}

export type PushMessage = { title: string; body: string; url: string; tag: string };

/** What the notification says. Counts only. */
export function wrapUpReminderMessage(appName: string, toUpdate: number): PushMessage {
  return {
    title: appName,
    body:
      toUpdate === 1
        ? "1 patient to wrap up today. Takes a minute."
        : `${toUpdate} patients to wrap up today. Takes a few minutes.`,
    url: "/wrap-up",
    tag: "wrap-up",
  };
}

export function testPushMessage(appName: string): PushMessage {
  return { title: appName, body: "Notifications are on. You'll get the wrap-up reminder here.", url: "/settings/reminder", tag: "test" };
}
