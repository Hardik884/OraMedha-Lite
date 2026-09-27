"use client";

import { cn } from "@/lib/utils";
import { normaliseLabel } from "@/lib/files/labels";

/** One-tap label suggestions; tapping the chosen one again clears it. */
export function LabelChips({
  suggestions,
  value,
  onChange,
}: {
  suggestions: string[];
  value: string;
  onChange: (label: string) => void;
}) {
  const current = normaliseLabel(value);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested labels">
      {suggestions.map((s) => {
        const on = current === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? "" : s)}
            className={cn(
              "h-10 cursor-pointer rounded-full border px-3.5 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              on
                ? "border-accent-soft-border bg-accent-soft font-semibold text-accent-hover"
                : "border-border bg-surface text-text-primary hover:border-border-strong",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
