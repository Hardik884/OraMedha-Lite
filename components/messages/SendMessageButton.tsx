"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatAppointmentWhen, formatTime, istDateOf, istToday } from "@/lib/dates";
import { sendMessage } from "@/lib/messages/send";
import type { MessageDraft } from "@/lib/messages/draft";

/** "Opened WhatsApp · 7:02 PM" — honest: we know WhatsApp opened, not that it was sent. */
export function openedText(at: string): string {
  const when = istDateOf(at) === istToday() ? formatTime(at) : formatAppointmentWhen(at);
  return `Opened WhatsApp · ${when}`;
}

/**
 * Opens WhatsApp with the message filled in (through sendMessage) and shows
 * when the PG last did. `compact` is the small row button used in lists.
 */
export function SendMessageButton({
  draft,
  openedAt,
  label = "Send to patient on WhatsApp",
  variant = "block",
  className,
}: {
  draft: MessageDraft;
  openedAt: string | null;
  label?: string;
  variant?: "block" | "compact";
  className?: string;
}) {
  const router = useRouter();
  const [lastOpened, setLastOpened] = useState(openedAt);
  const opened = lastOpened ?? openedAt;

  function send() {
    const { recorded } = sendMessage(draft);
    setLastOpened(new Date().toISOString());
    void recorded.then((at) => {
      if (at) router.refresh();
    });
  }

  if (variant === "compact") {
    return (
      <span className={cn("flex shrink-0 flex-col items-end gap-0.5", className)}>
        <Button
          variant={opened ? "ghost" : "outline"}
          size="lg"
          className="px-3"
          onClick={send}
          aria-label={opened ? "Send again on WhatsApp" : label}
        >
          {opened ? <Check className="h-4 w-4 text-success" aria-hidden /> : <MessageCircle className="h-4 w-4 text-accent" aria-hidden />}
          {opened ? "Opened" : "Send"}
        </Button>
        {opened && <span className="text-xs text-text-secondary">{formatTime(opened)}</span>}
      </span>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button size="xl" block variant={opened ? "outline" : "default"} onClick={send}>
        <MessageCircle className="h-5 w-5" aria-hidden />
        {opened ? "Send again on WhatsApp" : label}
      </Button>
      <p className="text-center text-xs text-text-secondary" role="status" aria-live="polite">
        {opened ? `${openedText(opened)}. Tap Send there if you haven't.` : "Opens WhatsApp with the message ready. You tap Send."}
      </p>
    </div>
  );
}
