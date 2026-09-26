import { describe, expect, it } from "vitest";
import {
  addDays,
  formatAppointmentWhen,
  formatDayHeading,
  formatRelativeDay,
  formatShortDate,
  formatTime,
  isIsoDate,
  isoWeekday,
  istDateOf,
  istDayRange,
  istTimeOf,
  istToInstant,
  istToday,
  isTime,
} from "./dates";

describe("formatDayHeading", () => {
  it("formats as weekday, day and month", () => {
    expect(formatDayHeading(new Date("2026-09-25T06:00:00Z"))).toBe("Friday, 25 September");
  });

  it("uses India time, not the server's UTC clock", () => {
    // 20:00 UTC on 25 Sep is already 01:30 on 26 Sep in India.
    expect(formatDayHeading(new Date("2026-09-25T20:00:00Z"))).toBe("Saturday, 26 September");
  });
});

describe("India calendar helpers", () => {
  it("istToday / istDateOf roll over at midnight India time", () => {
    expect(istToday(new Date("2026-09-25T18:29:00Z"))).toBe("2026-09-25");
    expect(istToday(new Date("2026-09-25T18:30:00Z"))).toBe("2026-09-26");
    expect(istDateOf("2026-09-25T18:30:00Z")).toBe("2026-09-26");
  });

  it("istTimeOf gives the wall clock in India", () => {
    expect(istTimeOf("2026-09-26T03:30:00Z")).toBe("09:00");
  });

  it("istToInstant turns India date + time into UTC", () => {
    expect(istToInstant("2026-09-29", "11:00")).toBe("2026-09-29T05:30:00.000Z");
    expect(istToInstant("2026-09-29", "00:15")).toBe("2026-09-28T18:45:00.000Z");
  });

  it("istDayRange covers exactly one India day", () => {
    expect(istDayRange("2026-09-26")).toEqual({
      start: "2026-09-25T18:30:00.000Z",
      end: "2026-09-26T18:30:00.000Z",
    });
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-09-29", 3)).toBe("2026-10-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("isoWeekday numbers Monday 1 to Sunday 7", () => {
    expect(isoWeekday("2026-09-28")).toBe(1);
    expect(isoWeekday("2026-09-27")).toBe(7);
  });

  it("validates dates and times", () => {
    expect(isIsoDate("2026-09-26")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("26-09-2026")).toBe(false);
    expect(isTime("09:30")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("9:30")).toBe(false);
  });
});

describe("display formats", () => {
  const today = "2026-09-26";

  it("formatTime", () => {
    expect(formatTime("2026-09-26T03:30:00Z")).toBe("9:00 AM");
    expect(formatTime("2026-09-26T09:00:00Z")).toBe("2:30 PM");
  });

  it("formatShortDate adds the year only when it differs", () => {
    expect(formatShortDate("2026-09-25", today)).toBe("25 Sep");
    expect(formatShortDate("2025-12-01", today)).toBe("1 Dec 2025");
  });

  it("formatRelativeDay", () => {
    expect(formatRelativeDay("2026-09-26", today)).toBe("Today");
    expect(formatRelativeDay("2026-09-27", today)).toBe("Tomorrow");
    expect(formatRelativeDay("2026-09-25", today)).toBe("Yesterday");
    expect(formatRelativeDay("2026-09-29", today)).toBe("Tue, 29 Sep");
  });

  it("formatAppointmentWhen", () => {
    expect(formatAppointmentWhen("2026-09-29T05:30:00Z", today)).toBe("Tue, 29 Sep · 11:00 AM");
  });
});
