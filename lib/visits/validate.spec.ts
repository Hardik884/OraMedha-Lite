import { describe, expect, it } from "vitest";
import { validateNextStep, validateVisit } from "./validate";

const base = { stageIds: ["s1"], otherSelected: false, otherWork: "", outcome: "partial", note: "" };

describe("validateVisit", () => {
  it("accepts stages with an outcome", () => {
    expect(validateVisit({ ...base, stageIds: ["s1", "s2", "s1"], note: "  ok " })).toEqual({
      ok: true,
      value: { stageIds: ["s1", "s2"], otherWork: null, outcome: "partial", note: "ok" },
    });
  });

  it("accepts Other on its own, with a description", () => {
    expect(validateVisit({ ...base, stageIds: [], otherSelected: true, otherWork: " Pain relief " })).toMatchObject({
      ok: true,
      value: { stageIds: [], otherWork: "Pain relief" },
    });
  });

  it("needs something done, an outcome, and words for Other", () => {
    expect(validateVisit({ stageIds: [], otherSelected: false, otherWork: "", outcome: null, note: "" })).toEqual({
      ok: false,
      errors: { stages: "Choose what you did today", outcome: "Choose Partial or Complete" },
    });
    expect(validateVisit({ ...base, otherSelected: true, otherWork: " " })).toEqual({
      ok: false,
      errors: { otherWork: "Say briefly what you did" },
    });
  });

  it("drops Other text when Other is not ticked", () => {
    expect(validateVisit({ ...base, otherWork: "left over" })).toMatchObject({ ok: true, value: { otherWork: null } });
  });
});

describe("validateNextStep", () => {
  const NOW = new Date("2026-09-26T04:30:00Z"); // 10:00 IST
  const TODAY = "2026-09-26";

  it("a next stage with an appointment", () => {
    expect(
      validateNextStep(
        { kind: "stage", stageId: "s2", schedule: "now", date: "2026-09-29", time: "11:00", durationMin: 60 },
        NOW,
        TODAY,
      ),
    ).toEqual({
      ok: true,
      value: { kind: "stage", stageId: "s2", appointment: { startsAt: "2026-09-29T05:30:00.000Z", durationMin: 60 } },
    });
  });

  it("schedule later ignores the date", () => {
    expect(
      validateNextStep({ kind: "stage", stageId: "s2", schedule: "later", date: "", time: "", durationMin: 60 }, NOW, TODAY),
    ).toEqual({ ok: true, value: { kind: "stage", stageId: "s2", appointment: null } });
  });

  it("needs a next stage", () => {
    expect(
      validateNextStep({ kind: "stage", stageId: "", schedule: "later", date: "", time: "", durationMin: 60 }, NOW, TODAY),
    ).toEqual({ ok: false, errors: { stage: "Choose the next step" } });
  });

  it("complete, with or without a review", () => {
    expect(
      validateNextStep({ kind: "complete", review: false, date: "", time: "", durationMin: 30 }, NOW, TODAY),
    ).toEqual({ ok: true, value: { kind: "complete", appointment: null } });
    expect(
      validateNextStep({ kind: "complete", review: true, date: "", time: "10:00", durationMin: 30 }, NOW, TODAY),
    ).toEqual({ ok: false, errors: { date: "Choose a date" } });
  });

  it("refuses a time in the past", () => {
    expect(
      validateNextStep(
        { kind: "stage", stageId: "s2", schedule: "now", date: TODAY, time: "08:00", durationMin: 60 },
        NOW,
        TODAY,
      ),
    ).toEqual({ ok: false, errors: { time: "That time has already passed" } });
  });
});
