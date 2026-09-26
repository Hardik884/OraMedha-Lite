"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumnIncreasing, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_TABS, activeTabFor, type NavTabKey } from "@/lib/navigation/tabs";

const TAB_ICONS: Record<NavTabKey, LucideIcon> = {
  today: CalendarDays,
  patients: Users,
  progress: ChartColumnIncreasing,
};

/**
 * BottomNav — Today / Patients / Progress, pinned to the bottom edge where the
 * thumb rests. The active tab is emerald (icon pill + label), and is also
 * announced with aria-current, so it never depends on colour alone.
 *
 * Sits above the home indicator via the safe-area inset.
 */
export function BottomNav() {
  const pathname = usePathname();
  const active = activeTabFor(pathname);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md pb-safe px-safe"
    >
      <ul className="mx-auto grid h-nav max-w-lg grid-cols-3">
        {NAV_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.key];
          const isActive = active === tab.key;
          return (
            <li key={tab.key} className="flex">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-1 flex-col items-center justify-center gap-1 select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent rounded-lg",
                  isActive ? "text-accent" : "text-text-secondary"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-150",
                    isActive ? "bg-accent-soft" : "group-active:bg-surface-muted"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} aria-hidden="true" />
                </span>
                <span className={cn("text-xs leading-none", isActive ? "font-semibold" : "font-medium")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
