import { describe, expect, it } from "vitest";
import { attentionLines, buildAttention, type AttentionAppointment, type AttentionCase } from "./build";

const today = "2026-09-28";
const now = new Date("2026-09-28T06:00:00Z"); // 11:30 AM IST

function appt(id: string, startsAt: string, over: Partial<AttentionAppointment> = {}): AttentionAppointment {
  return {
    id,
    startsAt,
    status: "scheduled",
    patientId: `p-${id}`,
    patientName: `Patient ${id}`,
    patientPhone: "9876543210",
    caseId: `c-${id}`,
    caseLabel: "36 · Case type",
    purpose: "treatment",
    ...over,
  };
}

function kase(id: string, last: AttentionCase["last"]): AttentionCase {
  return {
    caseId: id,
    patientId: `p-${id}`,
    patientName: `Patient ${id}`,
    patientPhone: "9876543210",
    caseLabel: "36 · Case type",
    stageName: "Stage B",
    last,
  };
}

describe("buildAttention", () => {
  it("past appointments never updated → 'Did they come?', newest first, recordable up to 7 days back", () => {
    const { items } = buildAttention({
      pastLive: [appt("a", "2026-09-25T03:30:00Z"), appt("b", "2026-09-20T03:30:00Z"), appt("c", "2026-09-27T03:30:00Z")],
      upcoming: [],
      casesWithoutNext: [],
      today,
      now,
    });
    expect(items.map((i) => [i.category, i.key])).toEqual([
      ["forgotten", "forgotten-c"],
      ["forgotten", "forgotten-a"],
      ["forgotten", "forgotten-b"],
    ]);
    const canRecord = items.map((i) => i.category === "forgotten" && i.canRecordVisit);
    expect(canRecord).toEqual([true, true, false]); // 20 Sep is 8 days back
  });

  it("today's appointments are not 'forgotten' — they're still on Today", () => {
    const { items } = buildAttention({ pastLive: [appt("a", "2026-09-28T03:30:00Z")], upcoming: [], casesWithoutNext: [], today, now });
    expect(items).toEqual([]);
  });

  it("an appointment without a case can't open Update Visit", () => {
    const { items } = buildAttention({ pastLive: [appt("a", "2026-09-27T03:30:00Z", { caseId: null })], upcoming: [], casesWithoutNext: [], today, now });
    expect(items[0]).toMatchObject({ category: "forgotten", canRecordVisit: false });
  });

  it("unconfirmed upcoming appointments, soonest first; scheduled/confirmed ones are fine", () => {
    const { items } = buildAttention({
      pastLive: [],
      upcoming: [
        appt("a", "2026-09-29T05:30:00Z", { status: "unconfirmed" }),
        appt("b", "2026-09-28T09:30:00Z", { status: "unconfirmed" }),
        appt("c", "2026-09-29T06:30:00Z", { status: "scheduled" }),
        appt("d", "2026-09-29T07:30:00Z", { status: "confirmed" }),
      ],
      casesWithoutNext: [],
      today,
      now,
    });
    expect(items.map((i) => i.key)).toEqual(["unconfirmed-b", "unconfirmed-a"]);
  });

  it("a case with no next appointment is sorted by why: missed, cancelled, or simply none booked", () => {
    const { items, counts } = buildAttention({
      pastLive: [],
      upcoming: [],
      casesWithoutNext: [
        kase("m", { id: "am", status: "missed", startsAt: "2026-09-27T03:30:00Z" }),
        kase("x", { id: "ax", status: "cancelled", startsAt: "2026-09-30T03:30:00Z" }),
        kase("n", { id: "an", status: "completed", startsAt: "2026-09-21T03:30:00Z" }),
        kase("z", null),
      ],
      today,
      now,
    });
    expect(items.map((i) => [i.category, i.key])).toEqual([
      ["missed", "missed-m"],
      ["reschedule", "reschedule-x"],
      ["no_next", "no_next-n"],
      ["no_next", "no_next-z"],
    ]);
    expect(counts).toEqual({ forgotten: 0, unconfirmed: 0, missed: 1, reschedule: 1, no_next: 2, total: 4 });
  });

  it("a case whose last appointment was never updated shows once, as 'Did they come?'", () => {
    const forgotten = appt("a", "2026-09-26T03:30:00Z", { caseId: "c1" });
    const { items } = buildAttention({
      pastLive: [forgotten],
      upcoming: [],
      casesWithoutNext: [kase("c1", { id: "a", status: "scheduled", startsAt: forgotten.startsAt })],
      today,
      now,
    });
    expect(items.map((i) => i.category)).toEqual(["forgotten"]);
  });

  it("counts add up to the items (the box and the tab always agree)", () => {
    const { items, counts } = buildAttention({
      pastLive: [appt("a", "2026-09-26T03:30:00Z")],
      upcoming: [appt("b", "2026-09-29T05:30:00Z", { status: "unconfirmed" })],
      casesWithoutNext: [kase("z", null)],
      today,
      now,
    });
    expect(counts.total).toBe(items.length);
    expect(counts.forgotten + counts.unconfirmed + counts.missed + counts.reschedule + counts.no_next).toBe(counts.total);
  });
});

describe("attentionLines", () => {
  it("one line per non-empty group, singular and plural", () => {
    expect(
      attentionLines({ forgotten: 1, unconfirmed: 2, missed: 1, reschedule: 0, no_next: 3, total: 7 }).map((l) => l.text),
    ).toEqual([
      "1 past appointment not updated",
      "2 appointments unconfirmed",
      "1 patient missed an appointment",
      "3 cases with no next appointment",
    ]);
  });
});
