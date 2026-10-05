import { describe, expect, it } from "vitest";
import { planWrapUp, wrapUpAction, wrapUpState, type WrapUpAppointment } from "./plan";

const NOW = new Date("2026-10-05T12:30:00Z"); // 6:00 PM IST

function appt(over: Partial<WrapUpAppointment> & { id: string; startsAt: string }): WrapUpAppointment {
  return { status: "scheduled", caseId: "c-" + over.id, caseStatus: "ongoing", purpose: "treatment", ...over };
}

describe("wrapUpState", () => {
  it("asks about appointments that have started and are still open", () => {
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T04:00:00Z" }), NOW)).toBe("to_update");
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T04:00:00Z", status: "unconfirmed" }), NOW)).toBe("to_update");
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T12:30:00Z", status: "confirmed" }), NOW)).toBe("to_update");
  });

  it("keeps the rest of the day apart", () => {
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T13:00:00Z" }), NOW)).toBe("later");
  });

  it("shows answered ones as came / missed, and drops cancelled", () => {
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T04:00:00Z", status: "completed" }), NOW)).toBe("came");
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T04:00:00Z", status: "missed" }), NOW)).toBe("missed");
    expect(wrapUpState(appt({ id: "a", startsAt: "2026-10-05T04:00:00Z", status: "cancelled" }), NOW)).toBeNull();
  });
});

describe("wrapUpAction", () => {
  it("records a visit for an ongoing case's treatment appointment", () => {
    expect(wrapUpAction(appt({ id: "a", startsAt: "x" }))).toBe("update_visit");
  });

  it("just marks review visits, completed cases and appointments without a case as came", () => {
    expect(wrapUpAction(appt({ id: "a", startsAt: "x", purpose: "review" }))).toBe("mark_came");
    expect(wrapUpAction(appt({ id: "a", startsAt: "x", caseStatus: "completed" }))).toBe("mark_came");
    expect(wrapUpAction(appt({ id: "a", startsAt: "x", caseId: null, caseStatus: null }))).toBe("mark_came");
  });
});

describe("planWrapUp", () => {
  it("lists what still needs an answer first, then later today, then the answered ones", () => {
    const plan = planWrapUp(
      [
        appt({ id: "done", startsAt: "2026-10-05T03:30:00Z", status: "completed" }),
        appt({ id: "late", startsAt: "2026-10-05T13:30:00Z" }),
        appt({ id: "eleven", startsAt: "2026-10-05T05:30:00Z" }),
        appt({ id: "nine", startsAt: "2026-10-05T03:30:00Z", status: "confirmed" }),
        appt({ id: "noshow", startsAt: "2026-10-05T04:30:00Z", status: "missed" }),
        appt({ id: "off", startsAt: "2026-10-05T06:30:00Z", status: "cancelled" }),
      ],
      NOW,
    );
    expect(plan.items.map((i) => i.appointment.id)).toEqual(["nine", "eleven", "late", "done", "noshow"]);
    expect(plan).toMatchObject({ toUpdate: 2, later: 1, done: 2 });
  });

  it("is empty on a day without appointments", () => {
    expect(planWrapUp([], NOW)).toEqual({ items: [], toUpdate: 0, later: 0, done: 0 });
  });
});
