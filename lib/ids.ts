/**
 * A random UUID v4, generated on the phone BEFORE a save is attempted, so a
 * retry after a dropped connection reuses the same id and the database can
 * recognise it instead of creating a duplicate.
 *
 * Not crypto.randomUUID(): browsers only provide that on HTTPS, and PGs test
 * over plain http://192.168… on the clinic Wi-Fi. getRandomValues works in
 * both.
 */
export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
