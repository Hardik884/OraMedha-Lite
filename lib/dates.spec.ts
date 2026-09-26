import { describe, expect, it } from "vitest";
import { formatDayHeading } from "./dates";

describe("formatDayHeading", () => {
  it("formats as weekday, day and month", () => {
    expect(formatDayHeading(new Date("2026-09-25T06:00:00Z"))).toBe("Friday, 25 September");
  });

  it("uses India time, not the server's UTC clock", () => {
    // 20:00 UTC on 25 Sep is already 01:30 on 26 Sep in India.
    expect(formatDayHeading(new Date("2026-09-25T20:00:00Z"))).toBe("Saturday, 26 September");
  });
});
