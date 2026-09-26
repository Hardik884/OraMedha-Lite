/**
 * Everything in OraMedha Lite is shown in India time, whatever timezone the
 * server (e.g. Vercel, which runs in UTC) or the phone happens to be in.
 */
export const APP_TIME_ZONE = "Asia/Kolkata";

/** "Saturday, 26 September" — the heading on the Today screen. */
export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}
