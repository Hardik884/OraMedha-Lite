import { describe, expect, it } from "vitest";
import { draftMessage, openedAt } from "./draft";

const appt = { id: "a1", startsAt: "2026-09-29T05:30:00Z", patientName: "Rahul Sharma", patientPhone: "9876543210" };
const pg = { fullName: "Dr Riya Singh", college: "City Dental College" };
const now = new Date("2026-09-28T13:30:00Z");

describe("draftMessage", () => {
  it("carries the phone, the appointment time and the text", () => {
    const d = draftMessage("booked", appt, pg, now);
    expect(d).toMatchObject({ kind: "booked", reminder: null, appointmentId: "a1", forStartsAt: appt.startsAt, phone: "9876543210" });
    expect(d.text).toContain("Tue, 29 Sep at 11:00 AM");
  });

  it("a reminder remembers which reminder it is", () => {
    expect(draftMessage("reminder", appt, pg, now, "soon").reminder).toBe("soon");
    expect(draftMessage("reminder", appt, pg, now).reminder).toBe("evening");
  });
});

describe("openedAt", () => {
  const log = [
    { kind: "reminder" as const, reminder: "evening" as const, forStartsAt: "2026-09-29T05:30:00.000Z", at: "2026-09-28T13:40:00Z" },
    { kind: "reminder" as const, reminder: "evening" as const, forStartsAt: "2026-09-29T05:30:00+00:00", at: "2026-09-28T13:45:00Z" },
    { kind: "booked" as const, reminder: null, forStartsAt: "2026-09-29T05:30:00Z", at: "2026-09-26T10:00:00Z" },
  ];

  it("the latest time this exact message was opened", () => {
    expect(openedAt(log, { kind: "reminder", reminder: "evening", forStartsAt: appt.startsAt })).toBe("2026-09-28T13:45:00Z");
    expect(openedAt(log, { kind: "booked", reminder: null, forStartsAt: appt.startsAt })).toBe("2026-09-26T10:00:00Z");
  });

  it("a reminder sent for the old time doesn't count after the appointment moved", () => {
    expect(openedAt(log, { kind: "reminder", reminder: "evening", forStartsAt: "2026-09-29T09:30:00Z" })).toBeNull();
    expect(openedAt(log, { kind: "reminder", reminder: "soon", forStartsAt: appt.startsAt })).toBeNull();
  });
});
