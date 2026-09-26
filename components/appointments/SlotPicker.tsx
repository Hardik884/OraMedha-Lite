"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, Info, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addDays, formatAppointmentWhen, formatRelativeDay, formatTime, isIsoDate, istToInstant, isTime } from "@/lib/dates";
import { formatDuration } from "@/lib/scheduling/defaults";
import {
  checkSlot,
  describeProblem,
  findSlots,
  freeSlotsByDay,
  type SlotFinderInput,
} from "@/lib/scheduling/slot-finder";
import type { SchedulingData } from "@/lib/data/scheduling-query";

export type SlotValue = { date: string; time: string };

/**
 * The slot the PG is booking: OraMedha's suggestion (the first free slot in
 * the window) until the PG picks something else. Re-suggests automatically
 * when the duration or window changes — unless the PG chose a time
 * themselves, which is then kept and checked instead.
 */
export function useSlotChoice(args: {
  scheduling: SchedulingData;
  window: { from: string; to: string };
  durationMin: number;
  nowIso: string;
  excludeAppointmentIds?: string[];
  initial?: SlotValue | null;
}) {
  const { scheduling, durationMin, nowIso } = args;
  const { from, to } = args.window;
  // Keyed on plain values so a new array/object each render doesn't recompute.
  const excludeKey = (args.excludeAppointmentIds ?? []).join(",");

  const input: SlotFinderInput = useMemo(
    () => ({
      ...scheduling,
      window: { from, to },
      durationMin,
      now: new Date(nowIso),
      excludeAppointmentIds: excludeKey ? excludeKey.split(",") : [],
    }),
    [scheduling, from, to, durationMin, nowIso, excludeKey],
  );
  const result = useMemo(() => findSlots(input), [input]);
  const [manual, setManual] = useState<SlotValue | null>(args.initial ?? null);

  const suggested = result.kind === "none" ? null : { date: result.first.date, time: result.first.time };
  const value = manual ?? suggested;
  const problems = value && isIsoDate(value.date) && isTime(value.time) ? checkSlot(input, value.date, value.time, durationMin) : [];

  return {
    input,
    result,
    value,
    isSuggested: manual === null,
    problems,
    pick: (v: SlotValue) => setManual(v),
    backToSuggestion: () => setManual(null),
  };
}

export type SlotChoice = ReturnType<typeof useSlotChoice>;

/**
 * Next Step / Schedule: "Suggested appointment: Tue, 29 Sep · 11:00 AM" with
 * Edit, the reassurance that it fits, or named warnings for a hand-picked
 * time (which the PG may still book — they are in control).
 */
export function SlotPicker({
  choice,
  today,
  durationMin,
  windowLabel,
  error,
}: {
  choice: SlotChoice;
  today: string;
  durationMin: number;
  /** e.g. "Usual window: Tue, 29 Sep – Sat, 3 Oct (3–7 days)". */
  windowLabel?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const { result, value, isSuggested, problems } = choice;

  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold text-text-primary">
        {isSuggested ? "Suggested appointment" : "Your chosen time"}
      </h2>
      {windowLabel && <p className="text-sm text-text-secondary">{windowLabel}</p>}

      {result.kind === "after_window" && isSuggested && <Notice tone="info">{result.message}</Notice>}
      {result.kind === "none" && isSuggested && <Notice tone="warning">{result.message}</Notice>}

      {value ? (
        <Card className="flex items-center gap-3 p-4">
          <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-text-primary">
              {formatAppointmentWhen(istToInstant(value.date, value.time), today)}
            </p>
            <p className="text-sm text-text-secondary">{formatDuration(durationMin)}</p>
          </div>
          <Button variant="outline" size="lg" className="shrink-0 px-3" onClick={() => setOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Button>
        </Card>
      ) : (
        <Button variant="outline" size="xl" block onClick={() => setOpen(true)}>
          <CalendarClock className="h-5 w-5" aria-hidden />
          Pick a time
        </Button>
      )}

      {value &&
        (problems.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-success">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            This slot is within your timings and doesn&apos;t clash with other appointments.
          </p>
        ) : (
          <Warnings problems={problems.map((p) => describeProblem(p, today))} />
        ))}

      {!isSuggested && result.kind !== "none" && (
        <Button variant="ghost" size="lg" className="-ml-3 text-accent" onClick={choice.backToSuggestion}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Back to the suggestion ({formatAppointmentWhen(result.first.startsAt, today)})
        </Button>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {open && <ChooseSlotSheet choice={choice} today={today} durationMin={durationMin} onClose={() => setOpen(false)} />}
    </section>
  );
}

function Notice({ tone, children }: { tone: "info" | "warning"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex gap-2 rounded-[10px] border px-3.5 py-3 text-sm",
        tone === "info" ? "border-info-border bg-info-bg text-info" : "border-warning-border bg-warning-bg text-warning",
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function Warnings({ problems }: { problems: string[] }) {
  return (
    <div className="rounded-[10px] border border-warning-border bg-warning-bg px-3.5 py-3 text-sm text-warning" role="status">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        You can still book this, but:
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-9">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/** "Choose a different slot": free times grouped by day, plus a manual picker. */
function ChooseSlotSheet({
  choice,
  today,
  durationMin,
  onClose,
}: {
  choice: SlotChoice;
  today: string;
  durationMin: number;
  onClose: () => void;
}) {
  const { input, result, value } = choice;
  const [date, setDate] = useState(value?.date ?? today);
  const [time, setTime] = useState(value?.time ?? "");

  // Days to list: the window, or (when it's full) the week after the first free slot.
  const afterFrom = result.kind === "after_window" ? result.first.date : null;
  const groups = useMemo(
    () =>
      freeSlotsByDay(input, {
        maxPerDay: 8,
        range: afterFrom ? { from: afterFrom, to: addDays(afterFrom, 6) } : undefined,
      }),
    [input, afterFrom],
  );

  const manualValid = isIsoDate(date) && isTime(time);
  const manualProblems = manualValid ? checkSlot(input, date, time, durationMin).map((p) => describeProblem(p, today)) : [];

  function choose(v: SlotValue) {
    choice.pick(v);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title="Choose a different slot" description={`${formatDuration(durationMin)}, free times only`}>
      <div className="space-y-5 p-4">
        {groups.length === 0 ? (
          <p className="text-sm text-text-secondary">No free times in these days. Pick a time yourself below.</p>
        ) : (
          groups.map((g) => (
            <section key={g.date} className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">{formatRelativeDay(g.date, today)}</h3>
              <div className="flex flex-wrap gap-2">
                {g.slots.map((s) => {
                  const selected = value?.date === s.date && value.time === s.time;
                  return (
                    <button
                      key={s.startsAt}
                      type="button"
                      onClick={() => choose({ date: s.date, time: s.time })}
                      aria-pressed={selected}
                      className={cn(
                        "flex h-11 min-w-[5.5rem] items-center justify-center rounded-[10px] border px-3 text-sm tabular-nums cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                        selected
                          ? "border-accent-soft-border bg-accent-soft font-semibold text-accent-hover"
                          : "border-border bg-surface font-medium text-text-primary active:bg-surface-muted",
                      )}
                    >
                      {formatTime(s.startsAt)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text-primary">Pick a time yourself</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="slot-date">
              <Input id="slot-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time" htmlFor="slot-time">
              <Input id="slot-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          {manualValid &&
            (manualProblems.length === 0 ? (
              <p className="flex items-start gap-2 text-sm text-success">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Free — within your timings, no clash.
              </p>
            ) : (
              <Warnings problems={manualProblems} />
            ))}
          <Button variant="outline" size="xl" block disabled={!manualValid} onClick={() => choose({ date, time })}>
            Use this time
          </Button>
        </section>
      </div>
    </Dialog>
  );
}
