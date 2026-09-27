"use client";

import { cn } from "@/lib/utils";

/**
 * ChipSelect — a wrap of small one-tap choices (e.g. appointment durations).
 * Use ChoiceList for long labels; this is for short values. Each chip is a
 * 44px tap target, selected state is fill + border + weight, not colour alone.
 */
export function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex h-11 min-w-16 flex-col items-center justify-center rounded-[10px] border px-3.5 text-sm cursor-pointer",
              "transition-[background-color,border-color,color] duration-150 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              selected
                ? "border-accent-soft-border bg-accent-soft font-semibold text-accent-hover"
                : "border-border bg-surface font-medium text-text-primary hover:border-border-strong",
            )}
          >
            <span className="leading-tight">{opt.label}</span>
            {opt.hint && (
              <span className={cn("text-[11px] leading-tight", selected ? "text-accent-hover" : "text-text-secondary")}>
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
