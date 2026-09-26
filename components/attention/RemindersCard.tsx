import Link from "next/link";
import { BellRing, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import { AppointmentStatusBadge } from "@/components/shared/AppointmentStatusBadge";
import type { AppointmentStatus } from "@/lib/appointments/status";
import type { MessageDraft, ReminderSlot } from "@/lib/messages/draft";
import { formatTime } from "@/lib/dates";
import { patientPath } from "@/lib/navigation/paths";

export type ReminderRow = {
  appointmentId: string;
  patientId: string;
  caseId: string | null;
  patientName: string;
  startsAt: string;
  status: AppointmentStatus;
  slot: ReminderSlot;
  draft: MessageDraft;
  openedAt: string | null;
};

const TITLES: Record<ReminderSlot, string> = {
  evening: "Tomorrow's reminders",
  soon: "Starting soon — send a reminder",
};

/**
 * Reminders due now, per the PG's reminder preference: tomorrow's patients
 * in the evening, and/or a nudge a couple of hours before. One tap per
 * patient opens WhatsApp with the reminder; opened ones are ticked off.
 */
export function RemindersCard({ rows }: { rows: ReminderRow[] }) {
  const slots = (["soon", "evening"] as const).filter((s) => rows.some((r) => r.slot === s));
  if (slots.length === 0) return null;

  return (
    <div className="space-y-4">
      {slots.map((slot) => {
        const list = rows.filter((r) => r.slot === slot);
        const sent = list.filter((r) => r.openedAt).length;
        const done = sent === list.length;
        return (
          <section key={slot} className="space-y-2" aria-labelledby={`reminders-${slot}`}>
            <div className="flex items-center justify-between">
              <h2 id={`reminders-${slot}`} className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                {done ? <CircleCheck className="h-4 w-4 text-success" aria-hidden /> : <BellRing className="h-4 w-4 text-accent" aria-hidden />}
                {TITLES[slot]}
              </h2>
              <span className="text-sm tabular-nums text-text-secondary">
                {done ? "All opened" : `${sent} of ${list.length} opened`}
              </span>
            </div>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {list.map((r) => (
                  <li key={r.appointmentId} className="flex items-center gap-3 py-2.5 pl-4 pr-3">
                    <Link
                      href={patientPath(r.patientId, { caseId: r.caseId ?? undefined, from: "today" })}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="w-[4.25rem] shrink-0 text-sm font-medium tabular-nums text-text-body">{formatTime(r.startsAt)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-text-primary">{r.patientName}</span>
                        <AppointmentStatusBadge status={r.status} className="mt-0.5" />
                      </span>
                    </Link>
                    <SendMessageButton variant="compact" draft={r.draft} openedAt={r.openedAt} label={`Send reminder to ${r.patientName} on WhatsApp`} />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
