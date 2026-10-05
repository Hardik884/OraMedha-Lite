"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SegmentedTabsProps {
  tabs: { key: string; label: string; count?: number }[];
  /**
   * Pre-rendered content for each tab, keyed the same as `tabs[].key`. Leave
   * out when the parent controls the tab (`value` + `onChange`) and renders
   * the content itself.
   */
  panels?: Record<string, React.ReactNode>;
  defaultKey?: string;
  /** Controlled mode: the selected tab and a handler. */
  value?: string;
  onChange?: (key: string) => void;
  /**
   * Segments share the width equally (default). `false` sizes each segment to
   * its label, so four labels such as the file filters fit on a small phone.
   */
  equalWidth?: boolean;
  /** Stretch the control to full width with equal segments (default on Resident). */
  fullWidth?: boolean;
  className?: string;
}

/**
 * SegmentedTabs — the [ A ] [ B ] pill toggle from the main app, used in Resident
 * for Today / Pending, Ongoing / Completed and file filters.
 *
 * Resident sizing: full width by default with 40px segments in a 48px control,
 * and an optional count per tab ("Pending 3").
 */
export function SegmentedTabs({
  tabs,
  panels,
  defaultKey,
  value,
  onChange,
  fullWidth = true,
  equalWidth = true,
  className,
}: SegmentedTabsProps) {
  const [own, setOwn] = useState(defaultKey ?? tabs[0]?.key);
  const active = value ?? own;
  const setActive = (key: string) => {
    setOwn(key);
    onChange?.(key);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        className={cn(
          "items-center gap-1 rounded-[10px] bg-surface-muted p-1",
          fullWidth ? "flex w-full" : "inline-flex",
        )}
      >
        {tabs.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              data-compact
              onClick={() => setActive(tab.key)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 text-sm font-medium rounded-[8px] transition-all duration-150 cursor-pointer whitespace-nowrap",
                fullWidth && (equalWidth ? "flex-1 px-4" : "flex-auto px-3"),
                !fullWidth && "px-4",
                selected
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-xs leading-none tabular-nums",
                    selected ? "bg-accent-soft text-accent" : "bg-surface text-text-secondary"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {panels &&
        tabs.map((tab) => (
          <div key={tab.key} role="tabpanel" className={active === tab.key ? "" : "hidden"}>
            {panels[tab.key]}
          </div>
        ))}
    </div>
  );
}
