import { describe, expect, it } from "vitest";
import { effectiveStatus, isLive, reminderDue, unconfirmedFrom } from "./timing";

const at = (iso: string) => new Date(iso);
// Tue 29 Sep 2026, 11:00 AM IST
const appt = { status: "scheduled" as const, startsAt: "2026-09-29T05:30:00Z" };

describe("unconfirmedFrom", () => {
  it("evening before: 7 PM IST the day before", () => {
    expect(unconfirmedFrom(appt.startsAt, "evening_before").toISOString()).toBe("2026-09-28T13:30:00.000Z");
    expect(unconfirmedFrom(appt.startsAt, "both").toISOString()).toBe("2026-09-28T13:30:00.000Z");
  });

  it("2 hours before: two hours before the start", () => {
    expect(unconfirmedFrom(appt.startsAt, "two_hours_before").toISOString()).toBe("2026-09-29T03:30:00.000Z");
  });

  it("crosses midnight and month ends in IST", () => {
    // Thu 1 Oct, 9:00 AM IST → evening before is Wed 30 Sep, 7 PM IST.
    expect(unconfirmedFrom("2026-10-01T03:30:00Z", "evening_before").toISOString()).toBe("2026-09-30T13:30:00.000Z");
  });
});

describe("effectiveStatus", () => {
  it("booked, no reply yet → Scheduled", () => {
    expect(effectiveStatus(appt, "evening_before", at("2026-09-28T10:00:00Z"))).toBe("scheduled");
  });

  it("still not confirmed by the evening before → Unconfirmed", () => {
    expect(effectiveStatus(appt, "evening_before", at("2026-09-28T13:30:00Z"))).toBe("unconfirmed");
  });

  it("with the 2-hours-before preference it stays Scheduled until then", () => {
    expect(effectiveStatus(appt, "two_hours_before", at("2026-09-28T20:00:00Z"))).toBe("scheduled");
    expect(effectiveStatus(appt, "two_hours_before", at("2026-09-29T04:00:00Z"))).toBe("unconfirmed");
  });

  it("confirmed, missed, cancelled and completed are what the PG set", () => {
    for (const status of ["confirmed", "missed", "cancelled", "completed"] as const) {
      expect(effectiveStatus({ ...appt, status }, "evening_before", at("2026-09-29T04:00:00Z"))).toBe(status);
    }
  });
});

describe("isLive", () => {
  it("scheduled, confirmed and unconfirmed are still to happen", () => {
    expect(["scheduled", "confirmed", "unconfirmed", "missed", "cancelled", "completed"].map(isLive)).toEqual([
      true, true, true, false, false, false,
    ]);
  });
});

describe("reminderDue", () => {
  it("evening before: tomorrow's appointments, from 4 PM", () => {
    expect(reminderDue(appt, "evening_before", at("2026-09-28T10:00:00Z"))).toBeNull(); // 3:30 PM
    expect(reminderDue(appt, "evening_before", at("2026-09-28T10:30:00Z"))).toBe("evening"); // 4:00 PM
    expect(reminderDue(appt, "evening_before", at("2026-09-28T18:29:00Z"))).toBe("evening"); // 11:59 PM
    expect(reminderDue(appt, "evening_before", at("2026-09-29T01:00:00Z"))).toBeNull(); // on the day
  });

  it("2 hours before: from 3 hours before until it starts", () => {
    expect(reminderDue(appt, "two_hours_before", at("2026-09-28T13:30:00Z"))).toBeNull();
    expect(reminderDue(appt, "two_hours_before", at("2026-09-29T02:29:00Z"))).toBeNull();
    expect(reminderDue(appt, "two_hours_before", at("2026-09-29T02:30:00Z"))).toBe("soon");
    expect(reminderDue(appt, "two_hours_before", at("2026-09-29T05:30:00Z"))).toBeNull();
  });

  it("both: evening before and again on the day", () => {
    expect(reminderDue(appt, "both", at("2026-09-28T14:00:00Z"))).toBe("evening");
    expect(reminderDue(appt, "both", at("2026-09-29T04:00:00Z"))).toBe("soon");
  });

  it("never for appointments that are not still to happen", () => {
    expect(reminderDue({ ...appt, status: "cancelled" }, "both", at("2026-09-28T14:00:00Z"))).toBeNull();
  });
});
