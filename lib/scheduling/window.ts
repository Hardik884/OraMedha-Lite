import { addDays } from "@/lib/dates";
import {
  suggestNextStep,
  type CaseTypeTemplate,
  type Outcome,
  type PgModifierOverride,
  type PgStageOverride,
} from "@/lib/engine/next-step";

/**
 * The date range the slot finder searches ("the usual window").
 *
 * With a gap (from the next-step engine or the template), the window is
 * base date + gap. Without one, a plain scheduling horizon — tomorrow to two
 * weeks out — is used. That horizon is a calendar convenience, not a
 * clinical rule, and the screen does not call it a "usual window".
 */
export type SearchWindow = { from: string; to: string; usual: boolean };

const HORIZON_DAYS = 14;

export function windowFromGap(
  base: string,
  gap: { minDays: number; maxDays: number } | null,
  today: string,
): SearchWindow {
  if (!gap) return { from: addDays(today, 1), to: addDays(today, HORIZON_DAYS), usual: false };
  return { from: addDays(base, gap.minDays), to: addDays(base, gap.maxDays), usual: true };
}

export type LastUpdatedVisit = {
  visitDate: string;
  stageIds: string[];
  otherWork: string | null;
  outcome: Outcome;
  modifierId: string | null;
};

/**
 * The window for "Schedule" on a case that has no next appointment (e.g.
 * "schedule later", or step 3 of New Patient):
 *  - if a visit has been updated, re-run the engine on it: the window runs
 *    from THAT visit's date, so a case left in Pending for a while shows its
 *    window as passed rather than silently sliding;
 *  - otherwise (a brand-new case) use the current stage's normal gap from
 *    today;
 *  - otherwise the plain horizon.
 */
export function windowForCase(input: {
  template: CaseTypeTemplate;
  overrides: { stages: PgStageOverride[]; modifiers: PgModifierOverride[] };
  lastVisit: LastUpdatedVisit | null;
  currentStageId: string | null;
  today: string;
}): SearchWindow {
  const { template, overrides, lastVisit, currentStageId, today } = input;

  if (lastVisit) {
    const s = suggestNextStep({
      template,
      overrides,
      stagesDone: lastVisit.stageIds,
      otherWork: lastVisit.otherWork,
      outcome: lastVisit.outcome,
      modifierId: lastVisit.modifierId,
    });
    if (s.kind === "next_visit" && s.gap) return windowFromGap(lastVisit.visitDate, s.gap, today);
    return windowFromGap(today, null, today);
  }

  const stage = template.stages.find((s) => s.id === currentStageId);
  const mine = overrides.stages.find((o) => o.stageId === currentStageId);
  const min = mine?.gapMinDays ?? stage?.gapMinDays ?? null;
  const max = mine?.gapMaxDays ?? stage?.gapMaxDays ?? null;
  return windowFromGap(today, min !== null && max !== null ? { minDays: min, maxDays: max } : null, today);
}
