/**
 * The next-step engine.
 *
 * A PURE function — no database, no clock, no network (enforced by lint). It
 * knows nothing about any specialty: every stage name, duration, gap and
 * "what comes next" arrives as template DATA, and every sentence it writes
 * is assembled from those names.
 *
 *   stage(s) done today + Partial/Complete + optional modifier + PG overrides
 *     → next stage, gap window (min–max days), expected duration, reason
 *
 * Rules
 *  1. The furthest template stage done today (highest sort order) drives the
 *     suggestion. "Other" work isn't in the template, so on its own it gives
 *     no suggestion: the PG chooses.
 *  2. Partial → the template's next-on-partial stage, else the same stage.
 *     Gap: Partial gap (PG's, then template's), else the normal gap (PG's,
 *     then template's).
 *  3. Complete → the template's next-on-complete stage, with this stage's
 *     gap (PG's, then template's). No next stage = the case can be completed.
 *  4. A modifier (if it applies to the driving stage) can replace the next
 *     stage, the gap and the duration; the PG's modifier override beats the
 *     template's modifier values.
 *  5. Duration is that of the NEXT stage (PG's, then template's), unless a
 *     modifier sets one.
 *
 * The PG always confirms — and can change — whatever this suggests.
 */
import { describeGap } from "@/lib/settings/overrides";

// ── Inputs ───────────────────────────────────────────────────────────────────

export type TemplateStage = {
  id: string;
  name: string;
  sortOrder: number;
  durationMin: number;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  /** Optional separate gap after a Partial visit. */
  partialGapMinDays: number | null;
  partialGapMaxDays: number | null;
  /** NULL = last stage. */
  nextOnCompleteId: string | null;
  /** NULL = the same stage continues. */
  nextOnPartialId: string | null;
};

export type TemplateModifier = {
  id: string;
  /** Shown to the PG and used in the reason, e.g. "<group>: <label>". */
  label: string;
  /** NULL = can be noted at any stage. */
  stageId: string | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  nextStageId: string | null;
  durationMin: number | null;
};

export type CaseTypeTemplate = {
  name: string;
  stages: TemplateStage[];
  modifiers: TemplateModifier[];
};

export type PgStageOverride = {
  stageId: string;
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  partialGapMinDays: number | null;
  partialGapMaxDays: number | null;
};

export type PgModifierOverride = {
  modifierId: string;
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
};

export type Outcome = "partial" | "complete";

export type EngineInput = {
  template: CaseTypeTemplate;
  /** Template stage ids worked on today, in any order. */
  stagesDone: string[];
  /** Free-text work that isn't in the template ("Other"). */
  otherWork?: string | null;
  outcome: Outcome;
  modifierId?: string | null;
  overrides?: { stages?: PgStageOverride[]; modifiers?: PgModifierOverride[] };
};

// ── Output ───────────────────────────────────────────────────────────────────

export type GapWindow = { minDays: number; maxDays: number };
/** Where a value came from — shown to the PG ("based on your usual …"). */
export type ValueSource = "template" | "yours" | "modifier";
type StageRef = { id: string; name: string };

export type NextStepSuggestion =
  | {
      kind: "next_visit";
      drivingStage: StageRef;
      outcome: Outcome;
      nextStage: StageRef;
      /** NULL when neither the template nor the PG gives one. */
      gap: GapWindow | null;
      gapSource: ValueSource | null;
      durationMin: number;
      durationSource: ValueSource;
      /** Label of the modifier that changed the suggestion, if any. */
      modifierApplied: string | null;
      reason: string;
    }
  | { kind: "case_complete"; drivingStage: StageRef; reason: string }
  | { kind: "needs_choice"; reason: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function pair(min: number | null | undefined, max: number | null | undefined): GapWindow | null {
  return min != null && max != null ? { minDays: min, maxDays: max } : null;
}

/** First non-null gap in priority order, with where it came from. */
function firstGap(candidates: [GapWindow | null, ValueSource][]): { gap: GapWindow | null; source: ValueSource | null } {
  for (const [gap, source] of candidates) if (gap) return { gap, source };
  return { gap: null, source: null };
}

/** A stage's duration for this PG: theirs if set, else the template's. */
export function effectiveStageDuration(
  stage: TemplateStage,
  overrides: PgStageOverride[] = [],
): { durationMin: number; source: ValueSource } {
  const mine = overrides.find((o) => o.stageId === stage.id)?.durationMin;
  return mine != null ? { durationMin: mine, source: "yours" } : { durationMin: stage.durationMin, source: "template" };
}

/** The driving stage: the furthest template stage done today. */
export function drivingStageOf(template: CaseTypeTemplate, stagesDone: string[]): TemplateStage | null {
  const done = template.stages.filter((s) => stagesDone.includes(s.id));
  return done.sort((a, b) => b.sortOrder - a.sortOrder)[0] ?? null;
}

/** Modifiers the PG may note when this stage is the one that drives. */
export function applicableModifiers(template: CaseTypeTemplate, driving: TemplateStage | null): TemplateModifier[] {
  return template.modifiers.filter((m) => m.stageId === null || m.stageId === driving?.id);
}

// ── The engine ───────────────────────────────────────────────────────────────

export function suggestNextStep(input: EngineInput): NextStepSuggestion {
  const { template, outcome } = input;
  const stageOverrides = input.overrides?.stages ?? [];
  const byId = new Map(template.stages.map((s) => [s.id, s]));

  const driving = drivingStageOf(template, input.stagesDone);
  if (!driving) {
    return {
      kind: "needs_choice",
      reason: `Other work isn't part of the ${template.name} template, so choose the next step yourself.`,
    };
  }

  const several = template.stages.filter((s) => input.stagesDone.includes(s.id)).length > 1;
  const drivingLabel = several ? `${driving.name} (the furthest stage done today)` : driving.name;

  const mine = stageOverrides.find((o) => o.stageId === driving.id);
  const modifier = applicableModifiers(template, driving).find((m) => m.id === input.modifierId) ?? null;
  const modifierMine = modifier ? input.overrides?.modifiers?.find((o) => o.modifierId === modifier.id) : undefined;

  // ── Next stage ─────────────────────────────────────────────────────────────
  const templateNextId = outcome === "partial" ? (driving.nextOnPartialId ?? driving.id) : driving.nextOnCompleteId;
  const nextId = modifier?.nextStageId ?? templateNextId;
  const next = nextId ? byId.get(nextId) : undefined;

  if (!next) {
    return {
      kind: "case_complete",
      drivingStage: { id: driving.id, name: driving.name },
      reason: `${drivingLabel} was the last stage of ${template.name}, so the case can be completed.`,
    };
  }

  // ── Gap ────────────────────────────────────────────────────────────────────
  const normal: [GapWindow | null, ValueSource][] = [
    [pair(mine?.gapMinDays, mine?.gapMaxDays), "yours"],
    [pair(driving.gapMinDays, driving.gapMaxDays), "template"],
  ];
  const stageGap = firstGap(
    outcome === "partial"
      ? [
          [pair(mine?.partialGapMinDays, mine?.partialGapMaxDays), "yours"],
          [pair(driving.partialGapMinDays, driving.partialGapMaxDays), "template"],
          ...normal,
        ]
      : normal,
  );
  const modifierGap = modifier
    ? firstGap([
        [pair(modifierMine?.gapMinDays, modifierMine?.gapMaxDays), "yours"],
        [pair(modifier.gapMinDays, modifier.gapMaxDays), "modifier"],
      ])
    : { gap: null, source: null };
  const { gap, source: gapSource } = modifierGap.gap ? modifierGap : stageGap;

  // ── Duration ───────────────────────────────────────────────────────────────
  const modifierDuration = modifierMine?.durationMin ?? modifier?.durationMin ?? null;
  const { durationMin, source: durationSource } =
    modifierDuration != null
      ? { durationMin: modifierDuration, source: (modifierMine?.durationMin != null ? "yours" : "modifier") as ValueSource }
      : effectiveStageDuration(next, stageOverrides);

  // ── Reason (built only from template names) ────────────────────────────────
  const changedNext = modifier?.nextStageId != null && modifier.nextStageId !== templateNextId;
  let reason: string;
  if (changedNext) {
    const status = outcome === "partial" ? "is ongoing" : "is complete";
    reason = `${drivingLabel} ${status}, and ${modifier!.label} was noted, so the next step is ${next.name}${
      gap ? ` in ${describeGap(gap.minDays, gap.maxDays)}` : ""
    }.`;
  } else {
    if (outcome === "partial") {
      reason =
        next.id === driving.id
          ? `${drivingLabel} is ongoing, so the next visit continues ${next.name}.`
          : `${drivingLabel} is ongoing; after a partial ${driving.name} the next step is ${next.name}.`;
    } else {
      reason = `${drivingLabel} is complete, so the next step is ${next.name}.`;
    }
    if (modifier && modifierGap.gap) {
      reason += ` ${modifier.label} was noted, so the next visit is in ${describeGap(modifierGap.gap.minDays, modifierGap.gap.maxDays)}.`;
    }
  }

  const modifierChangedSomething = modifier !== null && (changedNext || modifierGap.gap !== null || modifierDuration !== null);

  return {
    kind: "next_visit",
    drivingStage: { id: driving.id, name: driving.name },
    outcome,
    nextStage: { id: next.id, name: next.name },
    gap,
    gapSource,
    durationMin,
    durationSource,
    modifierApplied: modifierChangedSomething ? modifier!.label : null,
    reason,
  };
}
