"use client";

import { cn } from "@/lib/utils";

/**
 * Switch — an on/off toggle (e.g. "working on Wednesday"). The whole 44px box
 * is the tap target; the track is emerald when on. Always pair it with a
 * visible label via `aria-labelledby` or `aria-label`.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  ...aria
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...aria}
    >
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform duration-150",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
