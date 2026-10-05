"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import type { AttentionCategory } from "@/lib/attention/build";

/**
 * Today / Pending, with the "Needs attention" box at the foot of Today.
 * The box and the Pending tab come from the same list, so their counts
 * agree; tapping a line of the box opens Pending at that group.
 */
export function TodayTabs({
  todayCount,
  pendingCount,
  today,
  pending,
  lines,
  initialTab = "today",
}: {
  todayCount: number;
  pendingCount: number;
  today: React.ReactNode;
  pending: React.ReactNode;
  lines: { category: AttentionCategory; text: string }[];
  initialTab?: "today" | "pending";
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const pendingRef = useRef<HTMLDivElement>(null);

  function openGroup(category: AttentionCategory) {
    setTab("pending");
    // After the tab has switched.
    requestAnimationFrame(() => {
      pendingRef.current
        ?.querySelector(`[data-attention="${category}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="space-y-4">
      <SegmentedTabs
        tabs={[
          { key: "today", label: "Today", count: todayCount },
          { key: "pending", label: "Pending", count: pendingCount },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className={tab === "today" ? "space-y-5" : "hidden"}>
        {today}
        {lines.length > 0 && (
          <section className="rounded-xl border border-warning-border bg-warning-bg/60 p-2" aria-labelledby="needs-attention">
            <h2 id="needs-attention" className="px-2 pb-1 pt-1.5 text-sm font-semibold text-text-primary">
              Needs attention
            </h2>
            <ul>
              {lines.map((l) => (
                <li key={l.category}>
                  <button
                    type="button"
                    onClick={() => openGroup(l.category)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm text-text-body hover:bg-surface/60 active:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <span className="flex-1">{l.text}</span>
                    <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div ref={pendingRef} className={tab === "pending" ? "space-y-5" : "hidden"}>
        {pending}
      </div>
    </div>
  );
}
