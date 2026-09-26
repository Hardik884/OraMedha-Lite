import { formatShortDate, isIsoDate } from "@/lib/dates";

/**
 * Progress and logbook counting rules. Everything is worked out from cases
 * and visits the PG already recorded — nothing is typed in.
 *
 *   Completed (per case type) — cases marked complete within the period
 *   Ongoing                   — open cases now (not limited to the period)
 *   Stage counts              — each stage recorded Complete in a visit in the period
 *   Never counted             — soft-deleted records; visits not yet updated;
 *                               appointments of any kind (a cancelled or
 *                               missed appointment has no visit, so it can't count)
 */

// ── Period ───────────────────────────────────────────────────────────────────
export type PeriodKind = "month" | "year" | "all" | "custom";
export type PeriodInput = { kind: PeriodKind; from?: string | null; to?: string | null };
export type Period = { from: string | null; to: string | null };

export const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function isPeriodKind(value: unknown): value is PeriodKind {
  return PERIOD_OPTIONS.some((p) => p.value === value);
}

function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resolvePeriod(input: PeriodInput, today: string): Period & { kind: PeriodKind; label: string } {
  const [y, m] = today.split("-").map(Number) as [number, number];
  if (input.kind === "month") {
    return { kind: "month", from: `${today.slice(0, 7)}-01`, to: lastDayOfMonth(y, m), label: "This month" };
  }
  if (input.kind === "year") return { kind: "year", from: `${y}-01-01`, to: `${y}-12-31`, label: "This year" };
  if (input.kind === "all") return { kind: "all", from: null, to: null, label: "All time" };

  let from = input.from && isIsoDate(input.from) ? input.from : null;
  let to = input.to && isIsoDate(input.to) ? input.to : null;
  if (from && to && from > to) [from, to] = [to, from];
  const label =
    from && to
      ? `${formatShortDate(from, today)} – ${formatShortDate(to, today)}`
      : from
        ? `From ${formatShortDate(from, today)}`
        : to
          ? `Until ${formatShortDate(to, today)}`
          : "All time";
  return { kind: "custom", from, to, label };
}

export function inPeriod(date: string, period: Period): boolean {
  return (!period.from || date >= period.from) && (!period.to || date <= period.to);
}

// ── Cases ────────────────────────────────────────────────────────────────────
export type ProgressCase = {
  caseId: string;
  caseTypeId: string;
  status: "ongoing" | "completed";
  /** India date the case was marked complete. */
  completedOn: string | null;
  isSpecial: boolean;
  deleted: boolean;
};

const completedIn = (c: ProgressCase, p: Period) =>
  !c.deleted && c.status === "completed" && c.completedOn !== null && inPeriod(c.completedOn, p);
const open = (c: ProgressCase) => !c.deleted && c.status === "ongoing";

export type CaseTypeRow = { caseTypeId: string; name: string; completed: number; ongoing: number; target: number | null };

export function caseTypeProgress(
  types: { id: string; name: string; sortOrder: number }[],
  cases: ProgressCase[],
  period: Period,
  targets: Record<string, number>,
): CaseTypeRow[] {
  return [...types]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => {
      const mine = cases.filter((c) => c.caseTypeId === t.id);
      return {
        caseTypeId: t.id,
        name: t.name,
        completed: mine.filter((c) => completedIn(c, period)).length,
        ongoing: mine.filter(open).length,
        target: targets[t.id] ?? null,
      };
    });
}

export function specialCounts(cases: ProgressCase[], period: Period): { completed: number; ongoing: number } {
  const special = cases.filter((c) => c.isSpecial);
  return { completed: special.filter((c) => completedIn(c, period)).length, ongoing: special.filter(open).length };
}

/** "8 / 10" towards a target, or "8 completed" with the bar relative to the busiest case type. */
export function targetProgress(
  completed: number,
  target: number | null,
  maxCompleted = completed,
): { text: string; fraction: number; reached: boolean } {
  if (target && target > 0) {
    return { text: `${completed} / ${target}`, fraction: Math.min(1, completed / target), reached: completed >= target };
  }
  return { text: `${completed} completed`, fraction: maxCompleted > 0 ? completed / maxCompleted : 0, reached: false };
}

// ── Logbook entries (one per stage worked on in a visit) ─────────────────────
export type LogEntry = {
  visitId: string;
  visitDate: string;
  createdAt: string;
  patientId: string;
  patientName: string;
  opdNumber: string | null;
  caseId: string;
  caseTypeId: string;
  caseTypeName: string;
  tooth: string | null;
  stageId: string;
  stageName: string;
  stageOrder: number;
  /** NULL: the visit hasn't been updated yet — not in the logbook. */
  outcome: "partial" | "complete" | null;
  isSpecial: boolean;
  deleted: boolean;
};

/** Entries that belong in the logbook: updated visits, nothing deleted. */
export function logbookEntries(entries: LogEntry[], period: Period, caseTypeId?: string | null): LogEntry[] {
  return entries
    .filter((e) => !e.deleted && e.outcome !== null && inPeriod(e.visitDate, period))
    .filter((e) => !caseTypeId || e.caseTypeId === caseTypeId)
    .sort(
      (a, b) =>
        b.visitDate.localeCompare(a.visitDate) || b.createdAt.localeCompare(a.createdAt) || a.stageOrder - b.stageOrder,
    );
}

export type StageCount = { stageId: string; name: string; caseTypeId: string; count: number };

export function stageCounts(entries: LogEntry[], period: Period): StageCount[] {
  const map = new Map<string, StageCount & { order: number }>();
  for (const e of entries) {
    if (e.deleted || e.outcome !== "complete" || !inPeriod(e.visitDate, period)) continue;
    const row = map.get(e.stageId) ?? { stageId: e.stageId, name: e.stageName, caseTypeId: e.caseTypeId, count: 0, order: e.stageOrder };
    row.count += 1;
    map.set(e.stageId, row);
  }
  return [...map.values()].sort((a, b) => a.order - b.order).map(({ order: _order, ...r }) => r);
}

export type Activity = {
  visitId: string;
  date: string;
  patientId: string;
  patientName: string;
  caseId: string;
  tooth: string | null;
  stages: string;
};

/** The latest updated visits, one line each. */
export function recentActivity(entries: LogEntry[], limit: number): Activity[] {
  const byVisit = new Map<string, LogEntry[]>();
  for (const e of entries) {
    if (e.deleted || e.outcome === null) continue;
    byVisit.set(e.visitId, [...(byVisit.get(e.visitId) ?? []), e]);
  }
  return [...byVisit.values()]
    .map((list) => {
      const first = list[0]!;
      return {
        visitId: first.visitId,
        date: first.visitDate,
        createdAt: first.createdAt,
        patientId: first.patientId,
        patientName: first.patientName,
        caseId: first.caseId,
        tooth: first.tooth,
        stages: [...list].sort((a, b) => a.stageOrder - b.stageOrder).map((e) => e.stageName).join(" + "),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(({ createdAt: _createdAt, ...a }) => a);
}
