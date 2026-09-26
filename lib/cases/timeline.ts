import type { BadgeVariant } from "@/components/ui/badge";

/**
 * The case timeline is DERIVED from visits — nothing is typed in twice.
 * Newest first, ending with "Case started".
 */
export type VisitOutcome = "partial" | "complete" | null;

export type TimelineVisit = {
  id: string;
  visitDate: string;
  stages: { name: string; outcome: VisitOutcome; sortOrder: number }[];
  /** Work that isn't in the template ("Other"). */
  otherWork?: string | null;
  /** The visit's own outcome — used when only "Other" work was done. */
  outcome?: VisitOutcome;
};

export type TimelineItem =
  | {
      kind: "visit";
      id: string;
      date: string;
      title: string;
      status: { label: string; variant: BadgeVariant };
      /** Today's visit can be corrected (e.g. Complete tapped instead of Partial). */
      editable: boolean;
    }
  | { kind: "started"; id: string; date: string; title: string };

const OUTCOME_STATUS: Record<"in_progress" | "partial" | "complete", { label: string; variant: BadgeVariant }> = {
  in_progress: { label: "In progress", variant: "accent" },
  partial: { label: "Partial", variant: "secondary" },
  complete: { label: "Completed", variant: "success" },
};

/** A visit is only "Completed" when every stage in it was; not yet updated wins over Partial. */
function visitStatus(outcomes: VisitOutcome[]) {
  if (outcomes.length === 0 || outcomes.some((o) => o === null)) return OUTCOME_STATUS.in_progress;
  if (outcomes.every((o) => o === "complete")) return OUTCOME_STATUS.complete;
  return OUTCOME_STATUS.partial;
}

export function buildTimeline(visits: TimelineVisit[], startedOn: string, today?: string): TimelineItem[] {
  const items: TimelineItem[] = [...visits]
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
    .map((v) => {
      const stages = [...v.stages].sort((a, b) => a.sortOrder - b.sortOrder);
      const names = [...stages.map((s) => s.name), ...(v.otherWork ? [v.otherWork] : [])];
      return {
        kind: "visit" as const,
        id: v.id,
        date: v.visitDate,
        title: names.length > 0 ? names.join(" + ") : "Visit",
        status: visitStatus(stages.length > 0 ? stages.map((s) => s.outcome) : [v.outcome ?? null]),
        editable: today !== undefined && v.visitDate === today,
      };
    });

  items.push({ kind: "started", id: "started", date: startedOn, title: "Case started" });
  return items;
}
