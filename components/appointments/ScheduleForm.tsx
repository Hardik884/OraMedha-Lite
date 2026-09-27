"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Info } from "lucide-react";
import { SlotPicker, useSlotChoice } from "@/components/appointments/SlotPicker";
import type { SchedulingData } from "@/lib/data/scheduling-query";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/ids";
import { caseLabel } from "@/lib/cases/status";
import { formatAppointmentWhen } from "@/lib/dates";
import { durationOptions, formatDuration } from "@/lib/scheduling/defaults";
import { patientPath } from "@/lib/navigation/paths";
import { scheduleAppointment, type ActionResult } from "@/app/(flow)/patients/actions";

type Errors = NonNullable<ActionResult<"date" | "time" | "durationMin">["errors"]>;

/**
 * "Schedule the next appointment": the slot finder suggests the first free
 * slot in the usual window (Edit to choose another or pick by hand); duration
 * is one tap, pre-set to how long this stage usually takes for this PG.
 */
export function ScheduleForm({
  patientId,
  caseId,
  patientName,
  caseTypeName,
  tooth,
  stageName,
  today,
  nowIso,
  scheduling,
  window,
  windowLabel,
  defaultDurationMin,
  existingNextAt,
  isNew,
}: {
  patientId: string;
  caseId: string;
  patientName: string;
  caseTypeName: string;
  tooth: string | null;
  stageName: string | null;
  today: string;
  nowIso: string;
  scheduling: SchedulingData;
  window: { from: string; to: string };
  windowLabel?: string;
  defaultDurationMin: number;
  existingNextAt: string | null;
  isNew: boolean;
}) {
  const [durationMin, setDurationMin] = useState(defaultDurationMin);
  const slot = useSlotChoice({ scheduling, window, durationMin, nowIso });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const appointmentId = useRef<string | null>(null);

  const patientHref = patientPath(patientId, { caseId });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    appointmentId.current ??= newId();
    const id = appointmentId.current;
    setFormError(null);
    startTransition(async () => {
      let result: ActionResult<"date" | "time" | "durationMin"> | undefined;
      try {
        result = await scheduleAppointment({
          appointmentId: id,
          patientId,
          caseId,
          date: slot.value?.date ?? "",
          time: slot.value?.time ?? "",
          durationMin,
          isNew,
        });
      } catch {
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    });
  }

  return (
    <>
      <FlowHeader
        backHref={patientHref}
        title={`${patientName}${tooth ? ` · ${tooth}` : ""}`}
        subtitle={stageName ? `${caseTypeName} · ${stageName}` : caseLabel(null, caseTypeName)}
      />
      <form onSubmit={submit} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-44">
        {isNew && (
          <p className="flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success-strong">
            <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
            Patient and today&apos;s visit saved.
          </p>
        )}

        <h1 className="text-xl font-semibold tracking-tight text-text-primary">Schedule the next appointment</h1>

        {existingNextAt && (
          <p className="flex gap-2 rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3 text-sm text-info">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Already booked for {formatAppointmentWhen(existingNextAt, today)}. This adds another appointment.
            </span>
          </p>
        )}

        <SlotPicker
          choice={slot}
          today={today}
          durationMin={durationMin}
          windowLabel={windowLabel}
          error={errors.date ?? errors.time}
        />

        <div className="space-y-2">
          <Label>Duration</Label>
          <ChipSelect
            label="Duration"
            value={durationMin}
            onChange={(v) => {
              setDurationMin(v);
              setErrors((x) => ({ ...x, durationMin: undefined }));
            }}
            options={durationOptions(defaultDurationMin).map((m) => ({
              value: m,
              label: formatDuration(m),
              hint: m === defaultDurationMin ? "usual" : undefined,
            }))}
          />
          {errors.durationMin && (
            <p className="text-sm text-danger" role="alert">
              {errors.durationMin}
            </p>
          )}
        </div>

        {formError && (
          <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}

        <BottomActions>
          <Button type="submit" size="xl" block isLoading={pending}>
            {pending ? "Booking…" : "Confirm appointment"}
          </Button>
          <Button asChild variant="ghost" size="lg" block>
            <Link href={patientHref}>Schedule later</Link>
          </Button>
        </BottomActions>
      </form>
    </>
  );
}
