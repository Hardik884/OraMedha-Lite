"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarX2,
  ChevronDown,
  CircleCheck,
  MessageCircle,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/components/shared/AppointmentStatusBadge";
import { SendMessageButton } from "@/components/messages/SendMessageButton";
import { availableActions, type AppointmentAction } from "@/lib/appointments/actions";
import type { ManagedAppointment } from "@/lib/appointments/managed";
import { formatAppointmentWhen } from "@/lib/dates";
import { reschedulePath } from "@/lib/navigation/paths";
import { cn } from "@/lib/utils";
import { setAppointmentStatus } from "@/app/(flow)/patients/appointment-actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

type Step = "menu" | "cancel" | "missed_done" | "cancelled_done";

const ROW =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-muted active:bg-surface-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

function Row({
  icon: Icon,
  title,
  hint,
  tone = "accent",
  ...props
}: { icon: LucideIcon; title: string; hint?: string; tone?: "accent" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={ROW} {...props}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tone === "danger" ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-medium text-text-primary">{title}</span>
        {hint && <span className="block text-sm text-text-secondary">{hint}</span>}
      </span>
    </button>
  );
}

/**
 * The status chip of an appointment, tappable: opens its actions — send the
 * booking message, mark confirmed / missed, reschedule, cancel. After
 * "missed" it offers the "please call us" message; after "cancel", a
 * reschedule.
 */
export function AppointmentActions({
  appointment: a,
  nowIso,
  today,
  className,
}: {
  appointment: ManagedAppointment;
  nowIso: string;
  today: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const actions = availableActions(a, new Date(nowIso));

  function close() {
    setOpen(false);
    setStep("menu");
    setError(null);
  }

  function change(to: "confirmed" | "missed" | "cancelled", next: Step | null) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setAppointmentStatus({ appointmentId: a.id, to });
        if (!result.ok) return setError(result.error);
        router.refresh();
        if (next) setStep(next);
        else close();
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  const has = (x: AppointmentAction) => actions.includes(x);
  const when = formatAppointmentWhen(a.startsAt, today);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "-m-1 flex items-center gap-0.5 rounded-full p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className,
        )}
        aria-label={`${a.patientName}'s appointment: change status or send a message`}
        disabled={actions.length === 0}
      >
        <AppointmentStatusBadge status={a.status} />
        {actions.length > 0 && <ChevronDown className="h-4 w-4 text-text-secondary" aria-hidden />}
      </button>

      <Dialog open={open} onClose={close} busy={pending} title={a.patientName} description={when} size="sm">
        <div className="p-2">
          {step === "menu" && (
            <ul>
              {has("message_booked") && (
                <li className="px-2 pb-2 pt-1">
                  {/* After a move, "send again" repeats the "moved" message. */}
                  {a.opened.rescheduled && !a.opened.booked ? (
                    <SendMessageButton draft={a.drafts.rescheduled} openedAt={a.opened.rescheduled} />
                  ) : (
                    <SendMessageButton draft={a.drafts.booked} openedAt={a.opened.booked} />
                  )}
                </li>
              )}
              {has("confirm") && (
                <li>
                  <Row
                    icon={CircleCheck}
                    title="Mark confirmed"
                    hint="The patient replied"
                    disabled={pending}
                    onClick={() => change("confirmed", null)}
                  />
                </li>
              )}
              {has("message_missed") && (
                <li className="px-2 pb-2 pt-1">
                  <SendMessageButton draft={a.drafts.missed} openedAt={a.opened.missed} label="Send “please call us” on WhatsApp" />
                </li>
              )}
              {has("missed") && (
                <li>
                  <Row icon={UserX} title="Mark missed" hint="The patient didn't come" disabled={pending} onClick={() => change("missed", "missed_done")} />
                </li>
              )}
              {has("reschedule") && (
                <li>
                  <Link href={reschedulePath(a.patientId, a.id)} className={ROW} onClick={close}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <CalendarClock className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-base font-medium text-text-primary">Reschedule</span>
                      <span className="block text-sm text-text-secondary">Pick a new time</span>
                    </span>
                  </Link>
                </li>
              )}
              {has("cancel") && (
                <li>
                  <Row icon={CalendarX2} title="Cancel appointment" tone="danger" disabled={pending} onClick={() => setStep("cancel")} />
                </li>
              )}
            </ul>
          )}

          {step === "cancel" && (
            <div className="space-y-4 p-2">
              <p className="text-sm text-text-body">
                Cancel {when}? The case will show under <strong>Needs rescheduling</strong> until you book a new time.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant="secondary" disabled={pending} onClick={() => setStep("menu")}>
                  Keep it
                </Button>
                <Button size="lg" variant="danger" isLoading={pending} onClick={() => change("cancelled", "cancelled_done")}>
                  Cancel it
                </Button>
              </div>
            </div>
          )}

          {step === "missed_done" && (
            <div className="space-y-4 p-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <UserX className="h-4 w-4 text-danger" aria-hidden />
                Marked missed.
              </p>
              <SendMessageButton draft={a.drafts.missed} openedAt={a.opened.missed} label="Send “please call us” on WhatsApp" />
              <Button asChild size="lg" variant="outline" block>
                <Link href={reschedulePath(a.patientId, a.id)} onClick={close}>
                  <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
                  Reschedule now
                </Link>
              </Button>
            </div>
          )}

          {step === "cancelled_done" && (
            <div className="space-y-4 p-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <CalendarX2 className="h-4 w-4 text-danger" aria-hidden />
                Cancelled. The case now needs rescheduling.
              </p>
              <Button asChild size="xl" block>
                <Link href={reschedulePath(a.patientId, a.id)} onClick={close}>
                  <CalendarClock className="h-5 w-5" aria-hidden />
                  Reschedule now
                </Link>
              </Button>
              <Button size="lg" variant="ghost" block onClick={close}>
                Later
              </Button>
            </div>
          )}

          {error && (
            <p className="px-3 pb-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {step === "menu" && (
            <p className="flex items-center gap-1.5 px-3 pb-2 pt-1 text-xs text-text-secondary">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              Messages open in your WhatsApp; you tap Send.
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
