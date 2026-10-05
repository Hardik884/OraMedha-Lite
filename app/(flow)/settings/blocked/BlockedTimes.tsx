"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarOff, Plus, Repeat, Trash2 } from "lucide-react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect } from "@/components/ui/chip-select";
import { ChoiceList } from "@/components/ui/choice-list";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { newId } from "@/lib/ids";
import { describeBlockedTime } from "@/lib/settings/blocked";
import { WEEKDAYS } from "@/lib/settings/working-hours";
import type { BlockedTime } from "@/lib/data/settings";
import { addBlockedTime, removeBlockedTime, type SettingsResult } from "../actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

type Errors = Partial<Record<"label" | "date" | "endDate" | "time" | "weekday", string>>;

const EMPTY_FORM = {
  kind: "one_off" as "one_off" | "weekly",
  label: "",
  date: "",
  endDate: "",
  allDay: true,
  startTime: "09:00",
  endTime: "11:00",
  weekday: "",
};

export function BlockedTimes({ blocks, today }: { blocks: BlockedTime[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: today });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saveId = useRef<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors({});
    setFormError(null);
  };

  function openSheet() {
    setForm({ ...EMPTY_FORM, date: today });
    setErrors({});
    setFormError(null);
    saveId.current = null;
    setOpen(true);
  }

  function save() {
    saveId.current ??= newId();
    const id = saveId.current;
    const block =
      form.kind === "weekly"
        ? { kind: "weekly" as const, label: form.label, weekday: form.weekday, startTime: form.startTime, endTime: form.endTime }
        : {
            kind: "one_off" as const,
            label: form.label,
            date: form.date,
            endDate: form.endDate || form.date,
            allDay: form.allDay,
            startTime: form.startTime,
            endTime: form.endTime,
          };
    startTransition(async () => {
      let result: SettingsResult<keyof Errors> | undefined;
      try {
        result = await addBlockedTime({ id, block });
      } catch (error) {
        if (isNavigationSignal(error)) return;
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.ok) setOpen(false);
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    });
  }

  function remove(id: string) {
    setRemoving(id);
    startTransition(async () => {
      try {
        await removeBlockedTime(id);
      } finally {
        setRemoving(null);
      }
    });
  }

  const weekly = blocks.filter((b) => b.kind === "weekly");
  const oneOff = blocks.filter((b) => b.kind !== "weekly");

  const list = (items: BlockedTime[], title: string) =>
    items.length > 0 && (
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {items.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
                <span className="text-accent" aria-hidden>
                  {b.kind === "weekly" ? <Repeat className="h-5 w-5" /> : <CalendarOff className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-text-primary">{b.label}</span>
                  <span className="block text-sm text-text-secondary">{describeBlockedTime(b, today)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove ${b.label}`}
                  onClick={() => remove(b.id)}
                  isLoading={removing === b.id}
                  className="text-text-secondary"
                >
                  {removing !== b.id && <Trash2 className="h-4 w-4" aria-hidden />}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    );

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <p className="text-sm text-text-secondary">
        No appointments will be suggested in these times — exams, seminars, leave.
      </p>

      {blocks.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarOff />} title="No blocked times" description="Add exams, seminars or days off." />
        </Card>
      ) : (
        <>
          {list(weekly, "Every week")}
          {list(oneOff, "Coming up")}
        </>
      )}

      <BottomActions>
        <Button size="xl" block onClick={openSheet}>
          <Plus className="h-5 w-5" aria-hidden />
          Add blocked time
        </Button>
      </BottomActions>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Block time"
        busy={pending}
        footer={
          <Button size="xl" block onClick={save} isLoading={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div className="space-y-5 p-4">
          <ChoiceList
            label="How often"
            layout="row"
            value={form.kind}
            onChange={(v) => set("kind", v as "one_off" | "weekly")}
            options={[
              { value: "one_off", label: "Once" },
              { value: "weekly", label: "Every week" },
            ]}
          />

          <Field label="What is it?" htmlFor="block-label" error={errors.label}>
            <Input
              id="block-label"
              placeholder={form.kind === "weekly" ? "e.g. Seminar" : "e.g. Exam"}
              autoCapitalize="sentences"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              hasError={Boolean(errors.label)}
            />
          </Field>

          {form.kind === "weekly" ? (
            <div className="space-y-2">
              <Label>Day</Label>
              <ChipSelect
                label="Day"
                value={form.weekday || null}
                onChange={(v) => set("weekday", v)}
                options={WEEKDAYS.map((d) => ({ value: d.day, label: d.short }))}
              />
              {errors.weekday && (
                <p className="text-sm text-danger" role="alert">
                  {errors.weekday}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" htmlFor="block-date" error={errors.date}>
                  <Input
                    id="block-date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    hasError={Boolean(errors.date)}
                  />
                </Field>
                {form.allDay && (
                  <Field label="Until (optional)" htmlFor="block-end" error={errors.endDate}>
                    <Input
                      id="block-end"
                      type="date"
                      min={form.date || today}
                      value={form.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                      hasError={Boolean(errors.endDate)}
                    />
                  </Field>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span id="block-allday" className="text-base font-medium text-text-primary">
                  All day
                </span>
                <Switch
                  checked={form.allDay}
                  onChange={(v) => set("allDay", v)}
                  aria-labelledby="block-allday"
                />
              </div>
            </>
          )}

          {(form.kind === "weekly" || !form.allDay) && (
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  step={300}
                  aria-label="From"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  hasError={Boolean(errors.time)}
                />
                <span className="text-text-secondary" aria-hidden>
                  –
                </span>
                <Input
                  type="time"
                  step={300}
                  aria-label="To"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  hasError={Boolean(errors.time)}
                />
              </div>
            </div>
          )}
          {errors.time && (
            <p className="text-sm text-danger" role="alert">
              {errors.time}
            </p>
          )}

          {formError && (
            <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
              {formError}
            </p>
          )}
        </div>
      </Dialog>
    </main>
  );
}
