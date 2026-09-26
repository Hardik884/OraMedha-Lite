"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Info } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect } from "@/components/ui/chip-select";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/ids";
import { caseLabel } from "@/lib/cases/status";
import { formatAppointmentWhen, isIsoDate, istToInstant, isTime } from "@/lib/dates";
import { durationOptions, formatDuration } from "@/lib/scheduling/defaults";
import { patientPath } from "@/lib/navigation/paths";
import { scheduleAppointment, type ActionResult } from "@/app/(flow)/patients/actions";

type Errors = NonNullable<ActionResult<"date" | "time" | "durationMin">["errors"]>;

/**
 * "Schedule the next appointment" — manual for now (the slot finder arrives in
 * Slice 5). Date and time use the phone's own pickers; duration is one tap,
 * pre-set to how long this stage usually takes for this PG.
 */
export function ScheduleForm({
  patientId,
  caseId,
  patientName,
  caseTypeName,
  tooth,
  stageName,
  today,
  defaults,
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
  defaults: { date: string; time: string; durationMin: number };
  existingNextAt: string | null;
  isNew: boolean;
}) {
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [durationMin, setDurationMin] = useState(defaults.durationMin);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const appointmentId = useRef<string | null>(null);

  const patientHref = patientPath(patientId, { caseId });
  const preview = isIsoDate(date) && isTime(time) ? formatAppointmentWhen(istToInstant(date, time), today) : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    appointmentId.current ??= newId();
    const id = appointmentId.current;
    setFormError(null);
    startTransition(async () => {
      let result: ActionResult<"date" | "time" | "durationMin"> | undefined;
      try {
        result = await scheduleAppointment({ appointmentId: id, patientId, caseId, date, time, durationMin });
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
          <p className="flex items-center gap-2 rounded-[10px] border border-success-border bg-success-bg px-3.5 py-3 text-sm text-success">
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="date" error={errors.date}>
            <Input
              id="date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((x) => ({ ...x, date: undefined, time: undefined }));
              }}
              hasError={Boolean(errors.date)}
            />
          </Field>
          <Field label="Time" htmlFor="time" error={errors.time}>
            <Input
              id="time"
              type="time"
              step={300}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors((x) => ({ ...x, time: undefined }));
              }}
              hasError={Boolean(errors.time)}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <ChipSelect
            label="Duration"
            value={durationMin}
            onChange={(v) => {
              setDurationMin(v);
              setErrors((x) => ({ ...x, durationMin: undefined }));
            }}
            options={durationOptions(defaults.durationMin).map((m) => ({
              value: m,
              label: formatDuration(m),
              hint: m === defaults.durationMin ? "usual" : undefined,
            }))}
          />
          {errors.durationMin && (
            <p className="text-sm text-danger" role="alert">
              {errors.durationMin}
            </p>
          )}
        </div>

        {preview && (
          <Card className="flex items-center gap-3 p-4">
            <CalendarCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-base font-semibold text-text-primary">{preview}</p>
              <p className="text-sm text-text-secondary">{formatDuration(durationMin)}</p>
            </div>
          </Card>
        )}

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
