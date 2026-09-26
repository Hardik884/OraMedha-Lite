/**
 * Which screen feedback was sent from, as a plain path. Record ids are
 * replaced with ":id" so a feedback row never points at a patient.
 */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function cleanScreen(from: string | null | undefined): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  const path = from.split(/[?#]/)[0]!.replace(UUID, ":id");
  if (!/^\/[A-Za-z0-9/_:-]*$/.test(path)) return null;
  return path.slice(0, 200);
}

/** Where Settings' back arrow goes: the tab it was opened from, else Today. */
export function settingsBackHref(from: string | null | undefined): string {
  return from === "/patients" || from === "/progress" ? from : "/today";
}

export const MAX_FEEDBACK_LENGTH = 2000;

export function validateFeedback(message: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return { ok: false, error: "Write a few words first." };
  if (text.length > MAX_FEEDBACK_LENGTH) return { ok: false, error: `Keep it under ${MAX_FEEDBACK_LENGTH} characters.` };
  return { ok: true, value: text };
}
