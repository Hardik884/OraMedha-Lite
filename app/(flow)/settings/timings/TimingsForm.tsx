"use client";

import { useState, useTransition } from "react";
import { Copy, Plus, X } from "lucide-react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect } from "@/components/ui/chip-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MAX_SESSIONS_PER_DAY, SLOT_STEPS, WEEKDAYS } from "@/lib/settings/working-hours";
import type { Session, WorkingHours } from "@/lib/scheduling/defaults";
import { updateClinicTimings, type SettingsResult } from "../actions";

/** What a newly switched-on day starts with (the PG edits it). */
const NEW_DAY: Session[] = [{ start: "09:00", end: "13:00" }];

export function TimingsForm({ initial, initialSlotStep }: { initial: WorkingHours; initialSlotStep: number }) {
  const [hours, setHours] = useState<Partial<Record<string, Session[]>>>(initial);
  // Remembers a day's sessions while it is switched off, so on→off→on is lossless.
  const [parked, setParked] = useState<Partial<Record<string, Session[]>>>({});
  const [slotStep, setSlotStep] = useState(initialSlotStep);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const workingDays = WEEKDAYS.filter((d) => (hours[d.day]?.length ?? 0) > 0);

  function update(day: string, sessions: Session[] | undefined) {
    setHours((h) => ({ ...h, [day]: sessions }));
    setErrors((e) => ({ ...e, [day]: undefined }));
    setFormError(null);
    setCopiedFrom(null);
  }

  function toggleDay(day: string, on: boolean) {
    if (on) {
      update(day, parked[day] ?? NEW_DAY);
    } else {
      setParked((p) => ({ ...p, [day]: hours[day] }));
      update(day, undefined);
    }
  }

  function setSession(day: string, index: number, field: keyof Session, value: string) {
    update(
      day,
      (hours[day] ?? []).map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function copyToOtherWorkingDays(from: string) {
    const source = hours[from] ?? [];
    setHours((h) => {
      const next = { ...h };
      for (const { day } of workingDays) if (day !== from) next[day] = source.map((s) => ({ ...s }));
      return next;
    });
    setErrors({});
    setCopiedFrom(from);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      let result: SettingsResult | undefined;
      try {
        result = await updateClinicTimings({ workingHours: hours, slotStepMin: slotStep });
      } catch {
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={save} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <p className="text-sm text-text-secondary">
        Appointments are only suggested inside these hours. Turn a day off if you don&apos;t see patients then.
      </p>

      <div className="space-y-3">
        {WEEKDAYS.map(({ day, long }) => {
          const sessions = hours[day] ?? [];
          const on = sessions.length > 0;
          const labelId = `day-${day}`;
          return (
            <Card key={day} className={cn("p-3", !on && "bg-surface-secondary")}>
              <div className="flex items-center justify-between gap-2 pl-1">
                <span id={labelId} className={cn("text-base font-semibold", on ? "text-text-primary" : "text-text-secondary")}>
                  {long}
                </span>
                <span className="flex items-center gap-1">
                  {!on && <span className="text-sm text-text-secondary">Off</span>}
                  <Switch checked={on} onChange={(v) => toggleDay(day, v)} aria-labelledby={labelId} />
                </span>
              </div>

              {on && (
                <div className="mt-2 space-y-2">
                  {sessions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        step={300}
                        aria-label={`${long} session ${i + 1} starts`}
                        value={s.start}
                        onChange={(e) => setSession(day, i, "start", e.target.value)}
                        hasError={Boolean(errors[day])}
                      />
                      <span className="text-text-secondary" aria-hidden>
                        –
                      </span>
                      <Input
                        type="time"
                        step={300}
                        aria-label={`${long} session ${i + 1} ends`}
                        value={s.end}
                        onChange={(e) => setSession(day, i, "end", e.target.value)}
                        hasError={Boolean(errors[day])}
                      />
                      {sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          aria-label={`Remove ${long} session ${i + 1}`}
                          onClick={() => update(day, sessions.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  ))}

                  {errors[day] && (
                    <p className="text-sm text-danger" role="alert">
                      {errors[day]}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-1">
                    {sessions.length < MAX_SESSIONS_PER_DAY && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        className="-ml-2 text-accent"
                        onClick={() => update(day, [...sessions, { start: "14:00", end: "16:00" }])}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Add session
                      </Button>
                    )}
                    {workingDays.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        className="text-text-body"
                        onClick={() => copyToOtherWorkingDays(day)}
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                        {copiedFrom === day ? "Copied to other days" : "Copy to other days"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Appointment slots every</Label>
        <ChipSelect
          label="Appointment slots every"
          value={slotStep}
          onChange={setSlotStep}
          options={SLOT_STEPS.map((m) => ({ value: m, label: `${m} min` }))}
        />
        <p className="text-xs text-text-secondary">Suggested times start on these steps, e.g. 9:00, 9:15, 9:30.</p>
      </div>

      {formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {formError}
        </p>
      )}

      <BottomActions>
        <Button type="submit" size="xl" block isLoading={pending}>
          {pending ? "Saving…" : "Save timings"}
        </Button>
      </BottomActions>
    </form>
  );
}
