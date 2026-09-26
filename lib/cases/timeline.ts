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

/**
 * Files shown under the timeline. A file added during Update Visit belongs to
 * that visit. One added from the Patient screen is shown under the visit (or
 * "Case started") on the day it was added; on a day with neither it gets its
 * own "Files added" entry.
 */
export type TimelineFile = {
  id: string;
  visitId: string | null;
  date: string;
  createdAt: string;
};

export type TimelineEntry<F extends TimelineFile = TimelineFile> =
  | (TimelineItem & { files: F[] })
  | { kind: "files"; id: string; date: string; title: string; files: F[] };

export function attachFiles<F extends TimelineFile>(items: TimelineItem[], files: F[]): TimelineEntry<F>[] {
  const entries: TimelineEntry<F>[] = items.map((item) => ({ ...item, files: [] }));
  const byId = new Map(entries.map((e) => [e.id, e]));
  const loose = new Map<string, F[]>();

  for (const file of [...files].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const target =
      (file.visitId ? byId.get(file.visitId) : undefined) ??
      entries.find((e) => e.kind === "visit" && e.date === file.date) ??
      entries.find((e) => e.kind === "started" && e.date === file.date);
    if (target && target.kind !== "files") target.files.push(file);
    else loose.set(file.date, [...(loose.get(file.date) ?? []), file]);
  }

  for (const [date, dayFiles] of loose) {
    const at = entries.findIndex((e) => e.date < date || (e.date === date && e.kind === "started"));
    const entry: TimelineEntry<F> = { kind: "files", id: `files-${date}`, date, title: "Files added", files: dayFiles };
    if (at === -1) entries.push(entry);
    else entries.splice(at, 0, entry);
  }
  return entries;
}
