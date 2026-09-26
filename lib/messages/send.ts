"use client";

import { whatsappHref } from "@/lib/contact/links";
import { recordMessageOpened } from "@/app/(flow)/patients/appointment-actions";
import type { MessageDraft } from "./draft";

/**
 * THE way a screen sends a patient message. Today: opens WhatsApp on the
 * patient's chat with the text filled in (the PG taps Send), and records that
 * WhatsApp was opened. With the WhatsApp Business API this function sends
 * for real instead; no screen changes.
 *
 * Call it straight from a tap: phones only let a page open another app in
 * direct response to the user.
 */
export type SendOutcome = { opened: boolean; recorded: Promise<string | null> };

export function sendMessage(draft: MessageDraft): SendOutcome {
  // Record first: if the app has to navigate away to open WhatsApp, the
  // request has already left.
  const recorded = recordMessageOpened({
    appointmentId: draft.appointmentId,
    kind: draft.kind,
    reminder: draft.reminder,
    forStartsAt: draft.forStartsAt,
  })
    .then((r) => (r.ok ? (r.at ?? new Date().toISOString()) : null))
    .catch(() => null);
  const url = whatsappHref(draft.phone, draft.text);
  const win = window.open(url, "_blank");
  if (win) {
    // WhatsApp's page must not be able to reach back into the app.
    win.opener = null;
  } else {
    // Blocked (some installed-app modes): open it in place instead.
    window.location.href = url;
  }
  return { opened: true, recorded };
}
