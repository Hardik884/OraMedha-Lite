"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChoiceOption } from "./choice-list";

/**
 * MultiChoiceList — ChoiceList where several rows can be ticked (e.g. "What
 * did you do today?" when more than one stage was done). Square check boxes
 * distinguish it from the single-choice list's round ones.
 */
export function MultiChoiceList({
  options,
  values,
  onChange,
  label,
  className,
}: {
  options: ChoiceOption[];
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  className?: string;
}) {
  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <div role="group" aria-label={label} className={cn("flex flex-col gap-2", className)}>
      {options.map((opt) => {
        const checked = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={opt.disabled}
            onClick={() => toggle(opt.value)}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left cursor-pointer",
              "transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              checked
                ? "bg-accent-soft border-accent-soft-border text-accent-hover"
                : "bg-surface border-border text-text-primary hover:border-border-strong active:bg-surface-muted",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium leading-snug">{opt.label}</span>
              {opt.description && (
                <span className={cn("mt-0.5 block text-sm leading-snug", checked ? "text-accent-hover" : "text-text-secondary")}>
                  {opt.description}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                checked ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-surface",
              )}
            >
              {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
