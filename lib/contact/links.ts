/**
 * Call and WhatsApp links for a patient's 10-digit Indian mobile.
 *
 * WhatsApp uses plain wa.me links (no Business API yet): the PG's own
 * WhatsApp opens on the patient's chat and the PG taps Send. Pre-filled
 * message text comes from the message templates (Slice 7), never from screens.
 */
export function telHref(national: string): string {
  return `tel:+91${national}`;
}

export function whatsappHref(national: string, text?: string): string {
  const base = `https://wa.me/91${national}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
