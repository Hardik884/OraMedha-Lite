"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { ChoiceList } from "@/components/ui/choice-list";
import { REMINDER_TIMINGS, type ReminderTiming } from "@/lib/settings/reminders";
import { updateReminderTiming } from "@/app/(flow)/settings/actions";

/** Saves as soon as the PG taps a choice — no Save button to forget. */
export function ReminderPicker({ initial }: { initial: ReminderTiming }) {
  const [value, setValue] = useState<ReminderTiming>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    const previous = value;
    setValue(next as ReminderTiming);
    setStatus("idle");
    startTransition(async () => {
      try {
        const result = await updateReminderTiming(next);
        if (result.formError) throw new Error(result.formError);
        setStatus("saved");
      } catch {
        setValue(previous);
        setStatus("error");
      }
    });
  }

  return (
    <div className="space-y-2 p-4">
      <ChoiceList
        label="When should patients get their reminder?"
        options={REMINDER_TIMINGS.map((r) => ({ value: r.value, label: r.label, description: r.description }))}
        value={value}
        onChange={choose}
      />
      <p className="flex min-h-5 items-center gap-1.5 text-sm" aria-live="polite">
        {pending ? (
          <span className="text-text-secondary">Saving…</span>
        ) : status === "saved" ? (
          <span className="flex items-center gap-1 text-success">
            <Check className="h-4 w-4" aria-hidden /> Saved
          </span>
        ) : status === "error" ? (
          <span className="text-danger">Couldn&apos;t save. Check your internet and try again.</span>
        ) : (
          <span className="text-text-secondary">Reminders start going out in a later update.</span>
        )}
      </p>
    </div>
  );
}
