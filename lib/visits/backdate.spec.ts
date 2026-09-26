import { describe, expect, it } from "vitest";
import { MAX_DAYS_BACK, canRecordVisitOn } from "./backdate";

describe("canRecordVisitOn", () => {
  const today = "2026-10-02";
  it("today and up to 7 days back, across a month end", () => {
    expect(MAX_DAYS_BACK).toBe(7);
    expect(canRecordVisitOn("2026-10-02", today)).toBe(true);
    expect(canRecordVisitOn("2026-09-25", today)).toBe(true);
    expect(canRecordVisitOn("2026-09-24", today)).toBe(false);
  });
  it("never a future day", () => {
    expect(canRecordVisitOn("2026-10-03", today)).toBe(false);
  });
});
