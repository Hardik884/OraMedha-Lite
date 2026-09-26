import { isPeriodKind, resolvePeriod } from "./count";

/**
 * The logbook's filters from the URL. The screen and the exports read the
 * same query, so an export always matches what's on screen.
 */
export type LogbookQuery = { caseType?: string; period?: string; from?: string; to?: string };

export function parseLogbookQuery(q: LogbookQuery, today: string, knownCaseTypes: string[]) {
  const period = resolvePeriod({ kind: isPeriodKind(q.period) ? q.period : "year", from: q.from, to: q.to }, today);
  const caseTypeId = q.caseType && knownCaseTypes.includes(q.caseType) ? q.caseType : null;
  return { period, caseTypeId };
}

/** The same filters as URL parameters (for links to exports). */
export function logbookQueryString(f: ReturnType<typeof parseLogbookQuery>): Record<string, string | null> {
  return {
    caseType: f.caseTypeId,
    period: f.period.kind,
    from: f.period.kind === "custom" ? f.period.from : null,
    to: f.period.kind === "custom" ? f.period.to : null,
  };
}
