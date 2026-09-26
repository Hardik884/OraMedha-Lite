import { describe, expect, it } from "vitest";
import {
  caseTypeProgress,
  inPeriod,
  logbookEntries,
  recentActivity,
  resolvePeriod,
  specialCounts,
  stageCounts,
  targetProgress,
  type LogEntry,
  type ProgressCase,
} from "./count";

const today = "2026-09-27";

describe("resolvePeriod", () => {
  it("this month, this year, all time", () => {
    expect(resolvePeriod({ kind: "month" }, today)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolvePeriod({ kind: "year" }, today)).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
    expect(resolvePeriod({ kind: "all" }, today)).toMatchObject({ from: null, to: null });
  });

  it("month ends: February and 31-day months", () => {
    expect(resolvePeriod({ kind: "month" }, "2028-02-10").to).toBe("2028-02-29");
    expect(resolvePeriod({ kind: "month" }, "2026-02-10").to).toBe("2026-02-28");
    expect(resolvePeriod({ kind: "month" }, "2026-12-31").to).toBe("2026-12-31");
  });

  it("custom range, swapped if entered backwards, open ends allowed", () => {
    expect(resolvePeriod({ kind: "custom", from: "2026-09-20", to: "2026-09-01" }, today)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-20",
    });
    expect(resolvePeriod({ kind: "custom", from: "2026-09-01", to: null }, today)).toMatchObject({ from: "2026-09-01", to: null });
    expect(resolvePeriod({ kind: "custom", from: "bad", to: "2026-13-40" }, today)).toMatchObject({ from: null, to: null });
  });

  it("labels", () => {
    expect(resolvePeriod({ kind: "month" }, today).label).toBe("This month");
    expect(resolvePeriod({ kind: "custom", from: "2026-09-01", to: "2026-09-20" }, today).label).toBe("1 Sep – 20 Sep");
    expect(resolvePeriod({ kind: "custom", from: "2025-09-01", to: null }, today).label).toBe("From 1 Sep 2025");
  });
});

describe("inPeriod", () => {
  it("is inclusive at both ends", () => {
    const p = { from: "2026-09-01", to: "2026-09-30" };
    expect(inPeriod("2026-09-01", p)).toBe(true);
    expect(inPeriod("2026-09-30", p)).toBe(true);
    expect(inPeriod("2026-10-01", p)).toBe(false);
    expect(inPeriod("2020-01-01", { from: null, to: null })).toBe(true);
  });
});

const month = resolvePeriod({ kind: "month" }, today);

function kase(over: Partial<ProgressCase> = {}): ProgressCase {
  return { caseId: "c", caseTypeId: "A", status: "ongoing", completedOn: null, isSpecial: false, deleted: false, ...over };
}

describe("caseTypeProgress", () => {
  const types = [
    { id: "A", name: "Type A", sortOrder: 1 },
    { id: "B", name: "Type B", sortOrder: 2 },
  ];

  it("completed = cases marked complete in the period; ongoing = open cases (any time)", () => {
    const cases = [
      kase({ caseId: "1", status: "completed", completedOn: "2026-09-10" }),
      kase({ caseId: "2", status: "completed", completedOn: "2026-08-31" }), // last month
      kase({ caseId: "3", status: "ongoing" }),
      kase({ caseId: "4", status: "ongoing", caseTypeId: "B" }),
      kase({ caseId: "5", status: "completed", completedOn: "2026-09-12", deleted: true }), // deleted
      kase({ caseId: "6", status: "ongoing", deleted: true }),
    ];
    expect(caseTypeProgress(types, cases, month, {})).toEqual([
      { caseTypeId: "A", name: "Type A", completed: 1, ongoing: 1, target: null },
      { caseTypeId: "B", name: "Type B", completed: 0, ongoing: 1, target: null },
    ]);
  });

  it("attaches the PG's target", () => {
    expect(caseTypeProgress(types, [], month, { A: 10 })[0]!.target).toBe(10);
  });
});

describe("specialCounts", () => {
  it("counts special cases the same way", () => {
    const cases = [
      kase({ isSpecial: true, status: "completed", completedOn: "2026-09-02" }),
      kase({ isSpecial: true, status: "ongoing" }),
      kase({ isSpecial: true, status: "ongoing", deleted: true }),
      kase({ isSpecial: false, status: "ongoing" }),
    ];
    expect(specialCounts(cases, month)).toEqual({ completed: 1, ongoing: 1 });
  });
});

function entry(over: Partial<LogEntry> = {}): LogEntry {
  return {
    visitId: "v",
    visitDate: "2026-09-10",
    createdAt: "2026-09-10T05:00:00Z",
    patientId: "p",
    patientName: "Patient",
    opdNumber: null,
    caseId: "c",
    caseTypeId: "A",
    caseTypeName: "Type A",
    tooth: "36",
    stageId: "s1",
    stageName: "Stage 1",
    stageOrder: 1,
    outcome: "complete",
    isSpecial: false,
    deleted: false,
    ...over,
  };
}

describe("stageCounts", () => {
  it("each stage recorded Complete in a visit in the period; partial, not-updated and deleted never count", () => {
    const entries = [
      entry({ stageId: "s1" }),
      entry({ stageId: "s1", visitId: "v2" }),
      entry({ stageId: "s2", stageName: "Stage 2", stageOrder: 2 }),
      entry({ stageId: "s2", outcome: "partial" }),
      entry({ stageId: "s2", outcome: null }),
      entry({ stageId: "s1", deleted: true }),
      entry({ stageId: "s1", visitDate: "2026-08-10" }),
    ];
    expect(stageCounts(entries, month)).toEqual([
      { stageId: "s1", name: "Stage 1", caseTypeId: "A", count: 2 },
      { stageId: "s2", name: "Stage 2", caseTypeId: "A", count: 1 },
    ]);
  });
});

describe("targetProgress", () => {
  it("'8 / 10' filling towards the target, never past full", () => {
    expect(targetProgress(8, 10)).toEqual({ text: "8 / 10", fraction: 0.8, reached: false });
    expect(targetProgress(12, 10)).toEqual({ text: "12 / 10", fraction: 1, reached: true });
  });

  it("without a target, the bar is relative to the busiest case type", () => {
    expect(targetProgress(5, null, 20)).toEqual({ text: "5 completed", fraction: 0.25, reached: false });
    expect(targetProgress(0, null, 0)).toEqual({ text: "0 completed", fraction: 0, reached: false });
  });
});

describe("recentActivity", () => {
  it("latest visits first, one line per visit with its stages in template order", () => {
    const entries = [
      entry({ visitId: "v1", visitDate: "2026-09-10", stageId: "s2", stageName: "Stage 2", stageOrder: 2, outcome: "partial" }),
      entry({ visitId: "v1", visitDate: "2026-09-10", stageId: "s1", stageName: "Stage 1", stageOrder: 1 }),
      entry({ visitId: "v2", visitDate: "2026-09-12", patientName: "Other" }),
      entry({ visitId: "v3", visitDate: "2026-09-11", deleted: true }),
      entry({ visitId: "v4", visitDate: "2026-09-13", outcome: null }),
    ];
    expect(recentActivity(entries, 5).map((a) => [a.visitId, a.date, a.patientName, a.stages])).toEqual([
      ["v2", "2026-09-12", "Other", "Stage 1"],
      ["v1", "2026-09-10", "Patient", "Stage 1 + Stage 2"],
    ]);
  });
});

describe("logbookEntries", () => {
  it("updated visits only, nothing deleted, by case type and period, newest first then stage order", () => {
    const entries = [
      entry({ visitId: "a", visitDate: "2026-09-10", stageOrder: 2, stageId: "s2" }),
      entry({ visitId: "a", visitDate: "2026-09-10", stageOrder: 1 }),
      entry({ visitId: "b", visitDate: "2026-09-12", caseTypeId: "B" }),
      entry({ visitId: "c", visitDate: "2026-09-11", outcome: null }),
      entry({ visitId: "d", visitDate: "2026-09-11", deleted: true }),
      entry({ visitId: "e", visitDate: "2026-07-11" }),
    ];
    expect(logbookEntries(entries, month).map((e) => `${e.visitId}${e.stageOrder}`)).toEqual(["b1", "a1", "a2"]);
    expect(logbookEntries(entries, month, "A").map((e) => e.visitId)).toEqual(["a", "a"]);
  });
});
