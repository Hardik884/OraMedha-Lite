import { describe, expect, it } from "vitest";
import { formatClock, formatSlotStep, quickSlotSteps, summarizeWorkingHours, validateWorkingHours } from "./working-hours";

const AM = { start: "09:00", end: "13:00" };
const PM = { start: "14:00", end: "16:00" };

describe("quickSlotSteps", () => {
  it("offers 15 min, 30 min and 1 hour", () => {
    expect(quickSlotSteps(15)).toEqual([15, 30, 60]);
    expect(quickSlotSteps(60)).toEqual([15, 30, 60]);
  });

  it("keeps a finer step the PG set in Settings", () => {
    expect(quickSlotSteps(10)).toEqual([10, 15, 30, 60]);
  });

  it("names the steps", () => {
    expect(formatSlotStep(60)).toBe("1 hour");
    expect(formatSlotStep(30)).toBe("30 min");
  });
});

describe("formatClock", () => {
  it.each([
    ["09:00", "9:00 AM"],
    ["12:30", "12:30 PM"],
    ["00:15", "12:15 AM"],
    ["16:00", "4:00 PM"],
  ])("%s → %s", (input, out) => {
    expect(formatClock(input)).toBe(out);
  });
});

describe("validateWorkingHours", () => {
  it("accepts days with sessions and sorts them", () => {
    expect(validateWorkingHours({ "1": [PM, AM], "3": [AM] })).toEqual({
      ok: true,
      value: { "1": [AM, PM], "3": [AM] },
    });
  });

  it("treats an empty day as a day off", () => {
    expect(validateWorkingHours({ "1": [AM], "7": [] })).toEqual({ ok: true, value: { "1": [AM] } });
  });

  it("needs at least one working day", () => {
    expect(validateWorkingHours({})).toEqual({
      ok: false,
      errors: {},
      formError: "Choose at least one working day",
    });
  });

  it("reports each day's own problem", () => {
    const result = validateWorkingHours({
      "1": [{ start: "13:00", end: "09:00" }],
      "2": [AM, { start: "12:00", end: "15:00" }],
      "3": [{ start: "", end: "10:00" }],
      "4": [AM, PM, AM, PM],
      "5": [AM],
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        "1": "Each session must end after it starts",
        "2": "Tuesday's sessions overlap",
        "3": "Set a start and end time for every Wednesday session",
        "4": "At most 3 sessions a day",
      },
    });
  });

  it("allows back-to-back sessions", () => {
    expect(validateWorkingHours({ "1": [AM, { start: "13:00", end: "14:00" }] }).ok).toBe(true);
  });
});

describe("summarizeWorkingHours", () => {
  it("groups consecutive days with the same hours", () => {
    const monSat = Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((d) => [d, [AM, PM]]));
    expect(summarizeWorkingHours(monSat)).toBe("Mon–Sat · 9:00 AM–1:00 PM, 2:00 PM–4:00 PM");
  });

  it("splits when hours differ or days are not consecutive", () => {
    expect(summarizeWorkingHours({ "1": [AM], "2": [AM], "3": [PM], "5": [AM] })).toBe(
      "Mon–Tue · 9:00 AM–1:00 PM; Wed · 2:00 PM–4:00 PM; Fri · 9:00 AM–1:00 PM",
    );
  });

  it("says when nothing is set", () => {
    expect(summarizeWorkingHours({})).toBe("No working days set");
  });
});
