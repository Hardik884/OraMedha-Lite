"use client";

/**
 * ThemeToggle — the Appearance control (copied from the main app).
 *
 * A three-way segmented control (Light / Dark / System) rather than a binary
 * switch, because "System" is a real third choice. The active segment is marked
 * with the emerald accent plus a label, so the selection is never communicated
 * by colour alone.
 *
 * Resident sizing: each segment is a 40px-tall tap target inside a 48px control.
 * `compact` shows icons only, for an app bar.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/constants";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
  hint: string;
}[] = [
  { value: "light", label: "Light", icon: Sun, hint: "Always use the light theme" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Always use the dark theme" },
  { value: "system", label: "System", icon: Monitor, hint: "Match your phone's setting" },
];

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  /** Icons only — for narrow containers like an app bar. */
  compact?: boolean;
}) {
  const { theme, setTheme, mounted } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-[10px] border border-border bg-surface-muted p-1",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
        // Before mount the stored preference is unknown, so nothing is marked
        // active. Guessing would flicker and would not match the server HTML.
        const isActive = mounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={compact ? label : undefined}
            title={hint}
            data-compact
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center rounded-[8px] font-medium cursor-pointer",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted",
              compact ? "w-10 px-0" : "gap-1.5 px-3.5 text-sm",
              isActive
                ? "bg-surface text-accent shadow-xs"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}
