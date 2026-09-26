import { describe, expect, it } from "vitest";
import { attentionRow } from "./rows";
import type { AttentionItem } from "./build";

const ctx = {
  pg: { fullName: "Dr Riya Singh", college: "City Dental College" },
  now: new Date("2026-09-28T06:00:00Z"),
  today: "2026-09-28",
  messages: new Map(),
  reminderSlot: () => "evening" as const,
};
const appointment = {
  id: "a1",
  startsAt: "2026-09-25T03:30:00Z",
  status: "scheduled" as const,
  patientId: "p1",
  patientName: "Rahul Sharma",
  patientPhone: "9876543210",
  caseId: "c1",
  caseLabel: "46 · Case type",
  purpose: "treatment" as const,
};

describe("attentionRow", () => {
  it("forgotten: asks 'Did Rahul come on 25 Sep?', offers the visit for that day and the missed message", () => {
    const item: AttentionItem = { category: "forgotten", key: "forgotten-a1", appointment, canRecordVisit: true };
    const row = attentionRow(item, ctx);
    expect(row.title).toBe("Did Rahul Sharma come on 25 Sep?");
    expect(row.detail).toBe("9:00 AM · 46 · Case type");
    expect(row.visitDate).toBe("2026-09-25");
    expect(row.message?.draft.kind).toBe("missed");
  });

  it("forgotten too long ago: no visit date to record", () => {
    const row = attentionRow({ category: "forgotten", key: "k", appointment, canRecordVisit: false }, ctx);
    expect(row.visitDate).toBeNull();
  });

  it("unconfirmed: a reminder to send", () => {
    const row = attentionRow(
      { category: "unconfirmed", key: "k", appointment: { ...appointment, startsAt: "2026-09-29T05:30:00Z", status: "unconfirmed" } },
      ctx,
    );
    expect(row.detail).toBe("Tomorrow · 11:00 AM · not confirmed");
    expect(row.message?.draft).toMatchObject({ kind: "reminder", reminder: "evening" });
  });

  it("missed / cancelled: say when; only missed offers 'please call us'", () => {
    const kase = {
      caseId: "c1",
      patientId: "p1",
      patientName: "Rahul Sharma",
      patientPhone: "9876543210",
      caseLabel: "46 · Case type",
      stageName: "Stage B",
      last: { id: "a1", status: "missed" as const, startsAt: appointment.startsAt },
    };
    const missed = attentionRow({ category: "missed", key: "k", kase, last: kase.last }, ctx);
    expect(missed.detail).toBe("Missed 25 Sep · 46 · Case type");
    expect(missed.message?.draft.kind).toBe("missed");
    const cancelled = attentionRow({ category: "reschedule", key: "k", kase, last: { ...kase.last, status: "cancelled" } }, ctx);
    expect(cancelled.detail).toBe("Cancelled 25 Sep · 46 · Case type");
    expect(cancelled.message).toBeNull();
  });
});
