import { describe, expect, it } from "vitest";
import { TRANSITIONS, availableActions } from "./actions";

const now = new Date("2026-09-28T06:00:00Z"); // Mon 28 Sep, 11:30 AM IST
const future = "2026-09-29T05:30:00Z";
const past = "2026-09-28T04:00:00Z";

describe("availableActions", () => {
  it("an upcoming booked appointment: message, confirm, reschedule, cancel", () => {
    expect(availableActions({ status: "scheduled", startsAt: future }, now)).toEqual([
      "message_booked",
      "confirm",
      "reschedule",
      "cancel",
    ]);
  });

  it("once confirmed there is nothing to confirm", () => {
    expect(availableActions({ status: "confirmed", startsAt: future }, now)).not.toContain("confirm");
  });

  it("once its time has come: missed instead of confirm", () => {
    expect(availableActions({ status: "confirmed", startsAt: past }, now)).toEqual(["missed", "reschedule", "cancel"]);
  });

  it("missed: 'please call us' and reschedule", () => {
    expect(availableActions({ status: "missed", startsAt: past }, now)).toEqual(["message_missed", "reschedule"]);
  });

  it("cancelled: reschedule only", () => {
    expect(availableActions({ status: "cancelled", startsAt: future }, now)).toEqual(["reschedule"]);
  });

  it("completed: nothing", () => {
    expect(availableActions({ status: "completed", startsAt: past }, now)).toEqual([]);
  });
});

describe("TRANSITIONS", () => {
  it("only changes an appointment that is still to happen", () => {
    expect(TRANSITIONS.confirmed).toEqual(["scheduled", "unconfirmed"]);
    expect(TRANSITIONS.missed).toEqual(["scheduled", "confirmed", "unconfirmed"]);
    expect(TRANSITIONS.cancelled).toEqual(["scheduled", "confirmed", "unconfirmed"]);
    expect(TRANSITIONS.completed).toEqual(["scheduled", "confirmed", "unconfirmed"]);
  });
});

describe("TRANSITIONS keys", () => {
  it("has only the four status changes as its own keys", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual(["cancelled", "completed", "confirmed", "missed"]);
    expect(Object.hasOwn(TRANSITIONS, "toString")).toBe(false);
  });
});
