"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, ClipboardPen, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import type { AttentionRowData } from "@/lib/attention/rows";
import { patientPath, reschedulePath, schedulePath, visitPath } from "@/lib/navigation/paths";
import { setAppointmentStatus } from "@/app/(flow)/patients/appointment-actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

/**
 * One item on the Pending tab, with its one-tap action:
 *   Did they come?    → Yes, update visit  /  No, missed (then "please call us")
 *   Not confirmed yet → Confirmed  +  Send reminder
 *   Missed            → Reschedule +  "please call us"
 *   Needs rescheduling→ Reschedule
 *   No next appt      → Schedule
 */
export function AttentionRow({ row }: { row: AttentionRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [markedMissed, setMarkedMissed] = useState(false);

  function change(to: "confirmed" | "missed" | "completed") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setAppointmentStatus({ appointmentId: row.appointmentId!, to });
        if (!result.ok) return setError(result.error);
        if (to === "missed") setMarkedMissed(true);
        else router.refresh();
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  const patientHref = patientPath(row.patientId, { caseId: row.caseId ?? undefined, from: "today" });

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-2">
        <Link href={patientHref} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="block text-base font-semibold text-text-primary">{row.title}</span>
          <span className="block truncate text-sm text-text-secondary">{row.detail}</span>
        </Link>
        {row.category === "unconfirmed" && row.message && (
          <SendMessageButton variant="compact" draft={row.message.draft} openedAt={row.message.openedAt} label="Send reminder on WhatsApp" />
        )}
        {row.category === "missed" && row.message && (
          <SendMessageButton variant="compact" draft={row.message.draft} openedAt={row.message.openedAt} label="Send “please call us” on WhatsApp" />
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {row.category === "forgotten" && !markedMissed && (
          <>
            {row.visitDate && row.caseId ? (
              <Button asChild size="lg" className="flex-1">
                <Link href={visitPath(row.patientId, row.caseId, { date: row.visitDate })}>
                  <ClipboardPen className="h-4 w-4" aria-hidden />
                  Yes, update visit
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="flex-1" isLoading={pending} onClick={() => change("completed")}>
                Yes, came
              </Button>
            )}
            <Button size="lg" variant="outline" className="flex-1" disabled={pending} onClick={() => change("missed")}>
              <UserX className="h-4 w-4 text-danger" aria-hidden />
              No, missed
            </Button>
          </>
        )}
        {row.category === "forgotten" && markedMissed && row.message && (
          <div className="w-full space-y-2">
            <p className="text-sm font-medium text-text-primary">Marked missed.</p>
            <SendMessageButton draft={row.message.draft} openedAt={row.message.openedAt} label="Send “please call us” on WhatsApp" />
            <div className="grid grid-cols-2 gap-2">
              <Button asChild size="lg" variant="outline">
                <Link href={reschedulePath(row.patientId, row.appointmentId!)}>Reschedule</Link>
              </Button>
              <Button size="lg" variant="ghost" onClick={() => router.refresh()}>
                Done
              </Button>
            </div>
          </div>
        )}
        {row.category === "unconfirmed" && (
          <Button size="lg" variant="outline" className="flex-1" isLoading={pending} onClick={() => change("confirmed")}>
            <CircleCheck className="h-4 w-4 text-success" aria-hidden />
            Patient confirmed
          </Button>
        )}
        {(row.category === "missed" || row.category === "reschedule") && (
          <Button asChild size="lg" className="flex-1">
            <Link href={reschedulePath(row.patientId, row.appointmentId!)}>Reschedule</Link>
          </Button>
        )}
        {row.category === "no_next" && row.caseId && (
          <Button asChild size="lg" className="flex-1">
            <Link href={schedulePath(row.patientId, row.caseId)}>Schedule</Link>
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
