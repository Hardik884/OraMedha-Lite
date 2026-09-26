"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { SlotPicker, useSlotChoice } from "@/components/appointments/SlotPicker";
import type { SchedulingData } from "@/lib/data/scheduling-query";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/ids";
import { formatAppointmentWhen } from "@/lib/dates";
import { durationOptions, formatDuration } from "@/lib/scheduling/defaults";
import { rescheduleAppointment } from "@/app/(flow)/patients/appointment-actions";

/**
 * Reschedule: the slot finder suggests the first free slot (the appointment
 * being moved doesn't count as a clash with itself); Edit to choose another.
 * A booked appointment is moved; a missed or cancelled one keeps its record
 * and a new one is booked.
 */
export function RescheduleForm({
  patientId,
  appointmentId,
  title,
  subtitle,
  currentStartsAt,
  currentStatus,
  today,
  nowIso,
  scheduling,
  window,
  windowLabel,
  durationMin: initialDuration,
  backHref,
}: {
  patientId: string;
  appointmentId: string;
  title: string;
  subtitle: string;
  currentStartsAt: string;
  currentStatus: "live" | "missed" | "cancelled";
  today: string;
  nowIso: string;
  scheduling: SchedulingData;
  window: { from: string; to: string };
  windowLabel?: string;
  durationMin: number;
  backHref: string;
}) {
  const [durationMin, setDurationMin] = useState(initialDuration);
  const slot = useSlotChoice({
    scheduling,
    window,
    durationMin,
    nowIso,
    excludeAppointmentIds: [appointmentId],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const newIdRef = useRef<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    newIdRef.current ??= newId();
    const id = newIdRef.current;
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await rescheduleAppointment({
          patientId,
          appointmentId,
          newId: id,
          date: slot.value?.date ?? "",
          time: slot.value?.time ?? "",
          durationMin,
        });
        if (result?.formError) setFormError(result.formError);
      } catch {
        setFormError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  const was = formatAppointmentWhen(currentStartsAt, today);

  return (
    <>
      <FlowHeader backHref={backHref} title={title} subtitle={subtitle} />
      <form onSubmit={submit} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-44">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">Reschedule</h1>
        <p className="flex gap-2 rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3 text-sm text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {currentStatus === "live"
              ? `Moves the appointment from ${was}.`
              : `The ${currentStatus} appointment (${was}) stays in the history; this books a new one.`}
          </span>
        </p>

        <SlotPicker choice={slot} today={today} durationMin={durationMin} windowLabel={windowLabel} />

        <div className="space-y-2">
          <Label>Duration</Label>
          <ChipSelect
            label="Duration"
            value={durationMin}
            onChange={setDurationMin}
            options={durationOptions(initialDuration).map((m) => ({
              value: m,
              label: formatDuration(m),
              hint: m === initialDuration ? "as booked" : undefined,
            }))}
          />
        </div>

        {formError && (
          <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}

        <BottomActions>
          <Button type="submit" size="xl" block isLoading={pending} disabled={!slot.value}>
            {pending ? "Saving…" : "Confirm new time"}
          </Button>
          <Button asChild variant="ghost" size="lg" block>
            <Link href={backHref}>Keep as it is</Link>
          </Button>
        </BottomActions>
      </form>
    </>
  );
}
