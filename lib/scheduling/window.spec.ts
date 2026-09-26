import { describe, expect, it } from "vitest";
import { windowForCase, windowFromGap } from "./window";
import type { CaseTypeTemplate, TemplateStage } from "@/lib/engine/next-step";

const stage = (id: string, order: number, gap: [number, number] | null, next: string | null): TemplateStage => ({
  id,
  name: id,
  sortOrder: order,
  durationMin: 60,
  gapMinDays: gap?.[0] ?? null,
  gapMaxDays: gap?.[1] ?? null,
  partialGapMinDays: null,
  partialGapMaxDays: null,
  nextOnCompleteId: next,
  nextOnPartialId: null,
});

const TEMPLATE: CaseTypeTemplate = {
  name: "T",
  stages: [stage("A", 10, [3, 7], "B"), stage("B", 20, [7, 14], "C"), stage("C", 30, null, null)],
  modifiers: [],
};
const NO_OVERRIDES = { stages: [], modifiers: [] };
const TODAY = "2026-09-26";

describe("windowFromGap", () => {
  it("adds the gap to the base date", () => {
    expect(windowFromGap("2026-09-26", { minDays: 3, maxDays: 7 }, TODAY)).toEqual({
      from: "2026-09-29",
      to: "2026-10-03",
      usual: true,
    });
  });

  it("falls back to a two-week horizon from tomorrow", () => {
    expect(windowFromGap("2026-09-26", null, TODAY)).toEqual({ from: "2026-09-27", to: "2026-10-10", usual: false });
  });
});

describe("windowForCase", () => {
  it("re-runs the engine on the last updated visit, from that visit's date", () => {
    expect(
      windowForCase({
        template: TEMPLATE,
        overrides: NO_OVERRIDES,
        lastVisit: { visitDate: "2026-09-20", stageIds: ["A"], otherWork: null, outcome: "complete", modifierId: null },
        currentStageId: "B",
        today: TODAY,
      }),
    ).toEqual({ from: "2026-09-23", to: "2026-09-27", usual: true });
  });

  it("a brand-new case uses the current stage's gap from today (the PG's own if set)", () => {
    expect(
      windowForCase({ template: TEMPLATE, overrides: NO_OVERRIDES, lastVisit: null, currentStageId: "A", today: TODAY }),
    ).toEqual({ from: "2026-09-29", to: "2026-10-03", usual: true });
    expect(
      windowForCase({
        template: TEMPLATE,
        overrides: {
          stages: [{ stageId: "A", durationMin: null, gapMinDays: 1, gapMaxDays: 2, partialGapMinDays: null, partialGapMaxDays: null }],
          modifiers: [],
        },
        lastVisit: null,
        currentStageId: "A",
        today: TODAY,
      }),
    ).toEqual({ from: "2026-09-27", to: "2026-09-28", usual: true });
  });

  it("no gap anywhere → the plain horizon", () => {
    expect(
      windowForCase({ template: TEMPLATE, overrides: NO_OVERRIDES, lastVisit: null, currentStageId: "C", today: TODAY }).usual,
    ).toBe(false);
    expect(
      windowForCase({
        template: TEMPLATE,
        overrides: NO_OVERRIDES,
        lastVisit: { visitDate: "2026-09-20", stageIds: [], otherWork: "x", outcome: "complete", modifierId: null },
        currentStageId: "A",
        today: TODAY,
      }).usual,
    ).toBe(false);
  });
});
