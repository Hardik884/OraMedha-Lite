"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  /** Optional second line, e.g. "Usually 60 min". */
  description?: string;
  disabled?: boolean;
}

interface ChoiceListProps {
  options: ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Accessible name for the group, e.g. "What did you do today?". */
  label: string;
  /** `stack` — full-width rows (stages, case types). `row` — equal side-by-side buttons (Partial / Complete). */
  layout?: "stack" | "row";
  className?: string;
}

/**
 * ChoiceList — Lite's "tap, don't type" control (design-system.md → Choice
 * lists). Full-width rows at least 48px tall; the selected row gets the
 * accent-soft fill, accent border and a check, so selection never relies on
 * colour alone.
 *
 * Generic on purpose: it knows nothing about stages or case types. Screens pass
 * in options that come from procedure-template data.
 */
export function ChoiceList({
  options,
  value,
  onChange,
  label,
  layout = "stack",
  className,
}: ChoiceListProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        layout === "stack" ? "flex flex-col gap-2" : "grid grid-flow-col auto-cols-fr gap-2",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left cursor-pointer",
              "transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              layout === "row" && "justify-center text-center",
              selected
                ? "bg-accent-soft border-accent-soft-border text-accent-hover"
                : "bg-surface border-border text-text-primary hover:border-border-strong active:bg-surface-muted"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium leading-snug">{opt.label}</span>
              {opt.description && (
                <span
                  className={cn(
                    "mt-0.5 block text-sm leading-snug",
                    selected ? "text-accent-hover/80" : "text-text-secondary"
                  )}
                >
                  {opt.description}
                </span>
              )}
            </span>
            {layout === "stack" && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border-strong bg-surface"
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
