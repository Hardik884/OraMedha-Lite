import { describe, expect, it } from "vitest";
import { validateAppointment } from "./validate";

// 26 Sep 2026, 10:00 IST.
const NOW = new Date("2026-09-26T04:30:00Z");
const TODAY = "2026-09-26";

describe("validateAppointment", () => {
  it("accepts a future slot and converts it from India time", () => {
    expect(validateAppointment({ date: "2026-09-29", time: "11:00", durationMin: "60" }, NOW, TODAY)).toEqual({
      ok: true,
      value: { startsAt: "2026-09-29T05:30:00.000Z", durationMin: 60 },
    });
  });

  it("accepts later today", () => {
    expect(validateAppointment({ date: TODAY, time: "15:00", durationMin: 30 }, NOW, TODAY).ok).toBe(true);
  });

  it("refuses earlier today, on the time field", () => {
    expect(validateAppointment({ date: TODAY, time: "08:00", durationMin: 30 }, NOW, TODAY)).toEqual({
      ok: false,
      errors: { time: "That time has already passed" },
    });
  });

  it("refuses a past day, on the date field", () => {
    expect(validateAppointment({ date: "2026-09-20", time: "11:00", durationMin: 30 }, NOW, TODAY)).toEqual({
      ok: false,
      errors: { date: "That time has already passed" },
    });
  });

  it("reports missing fields", () => {
    expect(validateAppointment({ date: "", time: "", durationMin: "" }, NOW, TODAY)).toEqual({
      ok: false,
      errors: { date: "Choose a date", time: "Choose a time", durationMin: "Choose a duration" },
    });
  });

  it("refuses dates too far ahead", () => {
    expect(validateAppointment({ date: "2028-01-01", time: "11:00", durationMin: 30 }, NOW, TODAY).ok).toBe(false);
  });
});
