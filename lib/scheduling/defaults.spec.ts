import { describe, expect, it } from "vitest";
import { defaultNextVisit, durationOptions, formatDuration, parseWorkingHours } from "./defaults";

const MON_SAT = parseWorkingHours({
  "1": [{ start: "14:00", end: "16:00" }, { start: "09:00", end: "13:00" }],
  "2": [{ start: "09:00", end: "13:00" }],
  "3": [{ start: "09:00", end: "13:00" }],
  "4": [{ start: "09:00", end: "13:00" }],
  "5": [{ start: "09:00", end: "13:00" }],
  "6": [{ start: "10:30", end: "13:00" }],
});

describe("parseWorkingHours", () => {
  it("sorts sessions and drops malformed ones", () => {
    expect(
      parseWorkingHours({
        "1": [{ start: "14:00", end: "16:00" }, { start: "09:00", end: "13:00" }],
        "2": [{ start: "13:00", end: "09:00" }, { start: "nine", end: "10:00" }],
        "9": [{ start: "09:00", end: "10:00" }],
        "3": "all day",
      }),
    ).toEqual({ "1": [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "16:00" }] });
  });

  it("returns nothing for junk", () => {
    expect(parseWorkingHours(null)).toEqual({});
    expect(parseWorkingHours([1, 2])).toEqual({});
  });
});

describe("defaultNextVisit", () => {
  // 2026-09-26 is a Saturday.
  it("starts after the stage's minimum gap, at the first session", () => {
    expect(defaultNextVisit({ today: "2026-09-26", gapMinDays: 3, workingHours: MON_SAT })).toEqual({
      date: "2026-09-29",
      time: "09:00",
    });
  });

  it("is never today, even with a zero gap", () => {
    expect(defaultNextVisit({ today: "2026-09-28", gapMinDays: 0, workingHours: MON_SAT }).date).toBe(
      "2026-09-29",
    );
  });

  it("skips days off", () => {
    // Saturday + 1 = Sunday (off) → Monday.
    expect(defaultNextVisit({ today: "2026-09-26", gapMinDays: 1, workingHours: MON_SAT })).toEqual({
      date: "2026-09-28",
      time: "09:00",
    });
  });

  it("uses that day's own first session", () => {
    // Friday + 1 = Saturday, which starts at 10:30.
    expect(defaultNextVisit({ today: "2026-09-25", gapMinDays: 1, workingHours: MON_SAT }).time).toBe(
      "10:30",
    );
  });

  it("falls back when no clinic timings are set", () => {
    expect(defaultNextVisit({ today: "2026-09-26", gapMinDays: null, workingHours: {} })).toEqual({
      date: "2026-09-27",
      time: "10:00",
    });
  });
});

describe("durations", () => {
  it("offers common durations plus the stage default", () => {
    expect(durationOptions(60)).toEqual([15, 30, 45, 60, 90, 120]);
    expect(durationOptions(75)).toEqual([15, 30, 45, 60, 75, 90, 120]);
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("90 min");
    expect(formatDuration(120)).toBe("120 min");
    expect(formatDuration(150)).toBe("2 h 30 min");
    expect(formatDuration(180)).toBe("3 h");
  });
});
