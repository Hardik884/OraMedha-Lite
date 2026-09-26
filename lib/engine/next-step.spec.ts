/**
 * Next-step engine — written BEFORE the engine (CLAUDE.md).
 *
 * The fixtures mirror the seeded templates purely to show one engine serving
 * two specialties. The engine itself never sees a clinical word except as
 * data passed in here.
 */
import { describe, expect, it } from "vitest";
import { suggestNextStep, type CaseTypeTemplate, type EngineInput, type TemplateStage } from "./next-step";

function stage(
  id: string,
  sortOrder: number,
  durationMin: number,
  gap: [number, number] | null,
  next: string | null,
  extra: Partial<TemplateStage> = {},
): TemplateStage {
  return {
    id,
    name: id,
    sortOrder,
    durationMin,
    gapMinDays: gap?.[0] ?? null,
    gapMaxDays: gap?.[1] ?? null,
    partialGapMinDays: null,
    partialGapMaxDays: null,
    nextOnCompleteId: next,
    nextOnPartialId: null,
    ...extra,
  };
}

// Endodontics · Primary RCT (shape of the seed data)
const ENDO: CaseTypeTemplate = {
  name: "Primary RCT",
  stages: [
    stage("Access opening", 10, 45, [3, 7], "BMP"),
    stage("BMP", 20, 60, [7, 14], "Obturation"),
    stage("Obturation", 30, 60, null, null),
  ],
  modifiers: [
    {
      id: "medicament",
      label: "Medicament placed: Calcium hydroxide",
      stageId: null,
      gapMinDays: 7,
      gapMaxDays: 14,
      nextStageId: null,
      durationMin: null,
    },
  ],
};

// Endodontics · Retreatment — a modifier that changes the next STAGE
const RETREATMENT: CaseTypeTemplate = {
  name: "Retreatment",
  stages: [
    stage("Access opening", 10, 45, [3, 7], "GP removal"),
    stage("GP removal", 20, 90, [3, 7], "BMP"),
    stage("Review", 30, 30, [3, 7], "BMP"),
    stage("BMP", 40, 60, [7, 14], "Obturation"),
    stage("Obturation", 50, 60, null, null),
  ],
  modifiers: [
    {
      id: "medicament",
      label: "Medicament placed: Calcium hydroxide",
      stageId: null,
      gapMinDays: 7,
      gapMaxDays: 14,
      nextStageId: "Review",
      durationMin: null,
    },
  ],
};

// Prosthodontics · Crown
const CROWN: CaseTypeTemplate = {
  name: "Crown",
  stages: [
    stage("Tooth preparation", 10, 60, [0, 2], "Impression"),
    stage("Impression", 20, 30, [7, 10], "Trial"),
    stage("Trial", 30, 30, [3, 7], "Cementation"),
    stage("Cementation", 40, 30, null, null),
  ],
  modifiers: [],
};

const run = (template: CaseTypeTemplate, input: Omit<EngineInput, "template">) =>
  suggestNextStep({ template, ...input });

describe("Partial → same stage continues", () => {
  it("uses the stage's normal gap when it has no Partial gap", () => {
    expect(run(ENDO, { stagesDone: ["BMP"], outcome: "partial" })).toEqual({
      kind: "next_visit",
      drivingStage: { id: "BMP", name: "BMP" },
      outcome: "partial",
      nextStage: { id: "BMP", name: "BMP" },
      gap: { minDays: 7, maxDays: 14 },
      gapSource: "template",
      durationMin: 60,
      durationSource: "template",
      modifierApplied: null,
      reason: "BMP is ongoing, so the next visit continues BMP.",
    });
  });

  it("uses the stage's own Partial gap when the template has one", () => {
    const template = {
      ...ENDO,
      stages: ENDO.stages.map((s) =>
        s.id === "BMP" ? { ...s, partialGapMinDays: 2, partialGapMaxDays: 5 } : s,
      ),
    };
    const result = run(template, { stagesDone: ["BMP"], outcome: "partial" });
    expect(result).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "BMP" },
      gap: { minDays: 2, maxDays: 5 },
      gapSource: "template",
    });
  });

  it("follows a template's explicit next-on-partial stage", () => {
    const template = {
      ...ENDO,
      stages: ENDO.stages.map((s) => (s.id === "Access opening" ? { ...s, nextOnPartialId: "BMP" } : s)),
    };
    const result = run(template, { stagesDone: ["Access opening"], outcome: "partial" });
    expect(result).toMatchObject({ kind: "next_visit", nextStage: { id: "BMP" }, durationMin: 60 });
    expect(result.reason).toBe("Access opening is ongoing; after a partial Access opening the next step is BMP.");
  });

  it("a partial last stage still continues, with no gap to suggest", () => {
    expect(run(ENDO, { stagesDone: ["Obturation"], outcome: "partial" })).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "Obturation" },
      gap: null,
      gapSource: null,
      durationMin: 60,
    });
  });
});

describe("Complete → next stage in the template", () => {
  it("moves to the next stage, with this stage's gap and the next stage's duration", () => {
    expect(run(ENDO, { stagesDone: ["Access opening"], outcome: "complete" })).toEqual({
      kind: "next_visit",
      drivingStage: { id: "Access opening", name: "Access opening" },
      outcome: "complete",
      nextStage: { id: "BMP", name: "BMP" },
      gap: { minDays: 3, maxDays: 7 },
      gapSource: "template",
      durationMin: 60,
      durationSource: "template",
      modifierApplied: null,
      reason: "Access opening is complete, so the next step is BMP.",
    });
  });
});

describe("Several stages done today", () => {
  it("the furthest one along drives the suggestion, whatever order they were picked in", () => {
    const result = run(ENDO, { stagesDone: ["BMP", "Access opening"], outcome: "partial" });
    expect(result).toMatchObject({
      kind: "next_visit",
      drivingStage: { id: "BMP" },
      nextStage: { id: "BMP" },
      gap: { minDays: 7, maxDays: 14 },
    });
    expect(result.reason).toBe(
      "BMP (the furthest stage done today) is ongoing, so the next visit continues BMP.",
    );
  });

  it("works when the furthest is complete", () => {
    expect(run(ENDO, { stagesDone: ["Access opening", "BMP"], outcome: "complete" })).toMatchObject({
      kind: "next_visit",
      drivingStage: { id: "BMP" },
      nextStage: { id: "Obturation" },
      gap: { minDays: 7, maxDays: 14 },
    });
  });

  it("ignores ids that are not in the template", () => {
    expect(run(ENDO, { stagesDone: ["BMP", "not-a-stage"], outcome: "partial" })).toMatchObject({
      drivingStage: { id: "BMP" },
    });
  });
});

describe("Last stage Complete → case can be completed", () => {
  it("offers to complete the case", () => {
    expect(run(ENDO, { stagesDone: ["Obturation"], outcome: "complete" })).toEqual({
      kind: "case_complete",
      drivingStage: { id: "Obturation", name: "Obturation" },
      reason: "Obturation was the last stage of Primary RCT, so the case can be completed.",
    });
  });
});

describe("Modifier", () => {
  it("overrides the gap, keeping the template's next stage", () => {
    const result = run(ENDO, { stagesDone: ["BMP"], outcome: "partial", modifierId: "medicament" });
    expect(result).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "BMP" },
      gap: { minDays: 7, maxDays: 14 },
      gapSource: "modifier",
      modifierApplied: "Medicament placed: Calcium hydroxide",
    });
    expect(result.reason).toBe(
      "BMP is ongoing, so the next visit continues BMP. Medicament placed: Calcium hydroxide was noted, so the next visit is in 7–14 days.",
    );
  });

  it("overrides the next stage (and the gap)", () => {
    const result = run(RETREATMENT, { stagesDone: ["GP removal"], outcome: "complete", modifierId: "medicament" });
    expect(result).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "Review" },
      gap: { minDays: 7, maxDays: 14 },
      gapSource: "modifier",
      durationMin: 30,
    });
    expect(result.reason).toBe(
      "GP removal is complete, and Medicament placed: Calcium hydroxide was noted, so the next step is Review in 7–14 days.",
    );
  });

  it("can turn a last-stage completion into another visit", () => {
    expect(
      run(RETREATMENT, { stagesDone: ["Obturation"], outcome: "complete", modifierId: "medicament" }),
    ).toMatchObject({ kind: "next_visit", nextStage: { id: "Review" } });
  });

  it("overrides the duration when it sets one", () => {
    const template = {
      ...ENDO,
      modifiers: [{ ...ENDO.modifiers[0]!, durationMin: 20 }],
    };
    expect(run(template, { stagesDone: ["BMP"], outcome: "partial", modifierId: "medicament" })).toMatchObject({
      durationMin: 20,
      durationSource: "modifier",
    });
  });

  it("is ignored when it is only for a stage not done today", () => {
    const template = { ...ENDO, modifiers: [{ ...ENDO.modifiers[0]!, stageId: "Obturation", gapMinDays: 30, gapMaxDays: 40 }] };
    expect(run(template, { stagesDone: ["BMP"], outcome: "partial", modifierId: "medicament" })).toMatchObject({
      gap: { minDays: 7, maxDays: 14 },
      gapSource: "template",
      modifierApplied: null,
    });
  });
});

describe("PG override beats template default", () => {
  it("for the gap and the next stage's duration", () => {
    const result = run(ENDO, {
      stagesDone: ["Access opening"],
      outcome: "complete",
      overrides: {
        stages: [
          { stageId: "Access opening", durationMin: null, gapMinDays: 2, gapMaxDays: 4, partialGapMinDays: null, partialGapMaxDays: null },
          { stageId: "BMP", durationMin: 90, gapMinDays: null, gapMaxDays: null, partialGapMinDays: null, partialGapMaxDays: null },
        ],
      },
    });
    expect(result).toMatchObject({
      gap: { minDays: 2, maxDays: 4 },
      gapSource: "yours",
      durationMin: 90,
      durationSource: "yours",
    });
  });

  it("for the Partial gap, ahead of the template's Partial gap and the normal gap", () => {
    const template = {
      ...ENDO,
      stages: ENDO.stages.map((s) => (s.id === "BMP" ? { ...s, partialGapMinDays: 2, partialGapMaxDays: 5 } : s)),
    };
    const result = run(template, {
      stagesDone: ["BMP"],
      outcome: "partial",
      overrides: {
        stages: [{ stageId: "BMP", durationMin: null, gapMinDays: 10, gapMaxDays: 20, partialGapMinDays: 1, partialGapMaxDays: 3 }],
      },
    });
    expect(result).toMatchObject({ gap: { minDays: 1, maxDays: 3 }, gapSource: "yours" });
  });

  it("a PG's normal gap is used for Partial when neither has a Partial gap", () => {
    const result = run(ENDO, {
      stagesDone: ["BMP"],
      outcome: "partial",
      overrides: {
        stages: [{ stageId: "BMP", durationMin: null, gapMinDays: 5, gapMaxDays: 9, partialGapMinDays: null, partialGapMaxDays: null }],
      },
    });
    expect(result).toMatchObject({ gap: { minDays: 5, maxDays: 9 }, gapSource: "yours" });
  });

  it("for a modifier's gap and duration", () => {
    const result = run(ENDO, {
      stagesDone: ["BMP"],
      outcome: "partial",
      modifierId: "medicament",
      overrides: { modifiers: [{ modifierId: "medicament", durationMin: 45, gapMinDays: 10, gapMaxDays: 12 }] },
    });
    expect(result).toMatchObject({
      gap: { minDays: 10, maxDays: 12 },
      gapSource: "yours",
      durationMin: 45,
      durationSource: "yours",
    });
    expect(result.reason).toContain("so the next visit is in 10–12 days");
  });
});

describe('"Other" work → needs the PG to choose', () => {
  it("when only Other was done", () => {
    expect(run(ENDO, { stagesDone: [], otherWork: "Emergency pain relief", outcome: "complete" })).toEqual({
      kind: "needs_choice",
      reason: "Other work isn't part of the Primary RCT template, so choose the next step yourself.",
    });
  });

  it("when nothing from the template was picked", () => {
    expect(run(ENDO, { stagesDone: [], outcome: "partial" }).kind).toBe("needs_choice");
  });

  it("Other alongside a template stage: the stage still drives", () => {
    expect(
      run(ENDO, { stagesDone: ["BMP"], otherWork: "Also scaling", outcome: "partial" }),
    ).toMatchObject({ kind: "next_visit", drivingStage: { id: "BMP" } });
  });
});

describe("Same engine, Endo and Prostho", () => {
  it("Prostho Partial → same stage continues", () => {
    expect(run(CROWN, { stagesDone: ["Impression"], outcome: "partial" })).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "Impression" },
      gap: { minDays: 7, maxDays: 10 },
      durationMin: 30,
      reason: "Impression is ongoing, so the next visit continues Impression.",
    });
  });

  it("Prostho Complete → next stage", () => {
    expect(run(CROWN, { stagesDone: ["Tooth preparation"], outcome: "complete" })).toMatchObject({
      kind: "next_visit",
      nextStage: { id: "Impression" },
      gap: { minDays: 0, maxDays: 2 },
      durationMin: 30,
      reason: "Tooth preparation is complete, so the next step is Impression.",
    });
  });

  it("Prostho last stage → case can be completed", () => {
    expect(run(CROWN, { stagesDone: ["Cementation"], outcome: "complete" })).toEqual({
      kind: "case_complete",
      drivingStage: { id: "Cementation", name: "Cementation" },
      reason: "Cementation was the last stage of Crown, so the case can be completed.",
    });
  });

  it("Prostho several stages → furthest drives", () => {
    expect(run(CROWN, { stagesDone: ["Tooth preparation", "Impression"], outcome: "complete" })).toMatchObject({
      drivingStage: { id: "Impression" },
      nextStage: { id: "Trial" },
    });
  });
});
