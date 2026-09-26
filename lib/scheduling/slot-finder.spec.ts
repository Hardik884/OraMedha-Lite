/**
 * Slot finder — written BEFORE the finder (CLAUDE.md).
 *
 * All clock times below are India time (IST = UTC+05:30).
 * 2026-09-26 is a Saturday; 2026-09-27 a Sunday; 2026-09-28 a Monday.
 */
import { describe, expect, it } from "vitest";
import {
  checkSlot,
  describeProblem,
  findSlots,
  freeSlotsByDay,
  type SlotFinderInput,
} from "./slot-finder";
import type { WorkingHours } from "./defaults";

const IST = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const iso = (date: string, time: string) => IST(date, time).toISOString();

// Mon–Sat, 9:00–13:00 and 14:00–16:00 (lunch 13:00–14:00). Sunday off.
const MON_SAT: WorkingHours = Object.fromEntries(
  ["1", "2", "3", "4", "5", "6"].map((d) => [
    d,
    [
      { start: "09:00", end: "13:00" },
      { start: "14:00", end: "16:00" },
    ],
  ]),
);

function input(overrides: Partial<SlotFinderInput> = {}): SlotFinderInput {
  return {
    window: { from: "2026-09-28", to: "2026-10-02" },
    durationMin: 60,
    workingHours: MON_SAT,
    slotStepMin: 15,
    blocked: [],
    appointments: [],
    now: IST("2026-09-26", "10:00"),
    ...overrides,
  };
}

const at = (r: ReturnType<typeof findSlots>) => (r.kind === "none" ? null : `${r.first.date} ${r.first.time}`);

describe("the first free slot", () => {
  it("is the first session start of the first working day in the window", () => {
    const r = findSlots(input());
    expect(r.kind).toBe("in_window");
    expect(at(r)).toBe("2026-09-28 09:00");
    expect(r.kind !== "none" && r.first.startsAt).toBe(iso("2026-09-28", "09:00"));
  });

  it("skips non-working days", () => {
    // Window starts on Sunday.
    expect(at(findSlots(input({ window: { from: "2026-09-27", to: "2026-09-30" } })))).toBe("2026-09-28 09:00");
  });

  it("skips the time between sessions (lunch)", () => {
    // Morning fully booked → next is after lunch, not 13:00.
    const r = findSlots(
      input({ appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 240 }] }),
    );
    expect(at(r)).toBe("2026-09-28 14:00");
  });

  it("fits the whole appointment inside one session", () => {
    // 90 min: 12:00 would run into lunch; 12:30 too. First fit after 9:00 is blocked below.
    const r = findSlots(
      input({
        durationMin: 90,
        appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 180 }], // 9:00–12:00
      }),
    );
    // 12:00–13:30 crosses lunch → next is 14:00–15:30.
    expect(at(r)).toBe("2026-09-28 14:00");
  });

  it("never offers a slot longer than any session", () => {
    const r = findSlots(input({ durationMin: 300 }));
    expect(r.kind).toBe("none");
  });
});

describe("blocked times", () => {
  it("skips a one-off part-day block", () => {
    const r = findSlots(
      input({ blocked: [{ kind: "one_off", label: "Viva", startsAt: iso("2026-09-28", "09:00"), endsAt: iso("2026-09-28", "11:00") }] }),
    );
    expect(at(r)).toBe("2026-09-28 11:00");
  });

  it("skips a multi-day block", () => {
    const r = findSlots(
      input({
        blocked: [{ kind: "one_off", label: "Exams", startsAt: iso("2026-09-28", "00:00"), endsAt: iso("2026-09-30", "00:00") }],
      }),
    );
    expect(at(r)).toBe("2026-09-30 09:00");
  });

  it("skips a weekly block", () => {
    // Every Monday 9–11.
    const r = findSlots(
      input({ blocked: [{ kind: "weekly", label: "Seminar", weekday: 1, startTime: "09:00", endTime: "11:00" }] }),
    );
    expect(at(r)).toBe("2026-09-28 11:00");
  });

  it("a block that only partly overlaps still rules the slot out", () => {
    // 60-min slot at 9:00 would overlap a 9:45–10:00 block.
    const r = findSlots(
      input({ blocked: [{ kind: "weekly", label: "Round", weekday: 1, startTime: "09:45", endTime: "10:00" }] }),
    );
    expect(at(r)).toBe("2026-09-28 10:00");
  });
});

describe("existing appointments", () => {
  it("never overlaps one", () => {
    const r = findSlots(input({ appointments: [{ startsAt: iso("2026-09-28", "09:30"), durationMin: 30 }] }));
    // 9:00–10:00 overlaps 9:30–10:00; 9:15 too; first clear start is 10:00.
    expect(at(r)).toBe("2026-09-28 10:00");
  });

  it("may start exactly when another ends", () => {
    const r = findSlots(input({ appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 45 }] }));
    expect(at(r)).toBe("2026-09-28 09:45");
  });

  it("ignores cancelled appointments", () => {
    const r = findSlots(
      input({ appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 60, status: "cancelled" }] }),
    );
    expect(at(r)).toBe("2026-09-28 09:00");
  });
});

describe("slot step", () => {
  it("15-minute steps", () => {
    const r = findSlots(input({ appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 20 }] }));
    expect(at(r)).toBe("2026-09-28 09:30"); // 9:15 overlaps 9:00–9:20
  });

  it("30-minute steps", () => {
    const r = findSlots(
      input({ slotStepMin: 30, appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 20 }] }),
    );
    expect(at(r)).toBe("2026-09-28 09:30");
    const r2 = findSlots(
      input({ slotStepMin: 30, appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 40 }] }),
    );
    expect(at(r2)).toBe("2026-09-28 10:00");
  });

  it("aligns to the clock even when a session starts off-step", () => {
    const hours: WorkingHours = { "1": [{ start: "09:10", end: "12:00" }] };
    expect(at(findSlots(input({ workingHours: hours })))).toBe("2026-09-28 09:15");
  });
});

describe("never in the past", () => {
  it("today only after now, on the next step", () => {
    // Monday 10:07 → next 15-min step is 10:15.
    const r = findSlots(input({ window: { from: "2026-09-28", to: "2026-09-30" }, now: IST("2026-09-28", "10:07") }));
    expect(at(r)).toBe("2026-09-28 10:15");
  });

  it("a window that starts in the past begins today", () => {
    const r = findSlots(input({ window: { from: "2026-09-20", to: "2026-09-30" }, now: IST("2026-09-29", "15:30") }));
    expect(at(r)).toBe("2026-09-30 09:00"); // 15:30–16:30 doesn't fit the 16:00 end
  });
});

describe("nothing free in the window", () => {
  it("says so and offers the nearest slots after it", () => {
    const r = findSlots(
      input({
        window: { from: "2026-09-28", to: "2026-09-28" },
        blocked: [{ kind: "one_off", label: "Leave", startsAt: iso("2026-09-28", "00:00"), endsAt: iso("2026-09-29", "00:00") }],
      }),
    );
    expect(r.kind).toBe("after_window");
    if (r.kind !== "after_window") return;
    expect(r.message).toBe("No free slot on Mon, 28 Sep. These are the nearest free slots after it.");
    expect(`${r.first.date} ${r.first.time}`).toBe("2026-09-29 09:00");
    expect(r.first.date > "2026-09-28").toBe(true);
  });

  it("explains a window that has already passed", () => {
    const r = findSlots(input({ window: { from: "2026-09-10", to: "2026-09-12" }, now: IST("2026-09-26", "10:00") }));
    expect(r.kind).toBe("after_window");
    expect(r.kind === "after_window" && r.message).toBe(
      "The usual window (Thu, 10 Sep – Sat, 12 Sep) has passed. These are the earliest free slots.",
    );
    expect(at(r)).toBe("2026-09-26 10:15");
  });

  it("gives up clearly when nothing is free for weeks", () => {
    const r = findSlots(input({ workingHours: {} }));
    expect(r).toEqual({ kind: "none", message: "No free slot in the next 30 days. Pick a time yourself." });
  });
});

describe("alternatives", () => {
  it("offers 3–5, each on a different day where possible", () => {
    const r = findSlots(input());
    expect(r.kind).toBe("in_window");
    if (r.kind !== "in_window") return;
    const days = r.alternatives.map((s) => s.date);
    expect(r.alternatives.length).toBeGreaterThanOrEqual(3);
    expect(r.alternatives.length).toBeLessThanOrEqual(5);
    expect(new Set(days).size).toBe(days.length);
    expect(days).not.toContain(r.first.date);
    expect(days).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("fills with other times when the window has few days", () => {
    const r = findSlots(input({ window: { from: "2026-09-28", to: "2026-09-28" } }));
    if (r.kind !== "in_window") throw new Error("expected in_window");
    expect(r.alternatives.length).toBeGreaterThanOrEqual(3);
    for (const s of r.alternatives) expect(s.date).toBe("2026-09-28");
    expect(r.alternatives.map((s) => s.time)).not.toContain(r.first.time);
  });
});

describe("India time, midnight and month ends", () => {
  it("'today' is India's date even when UTC is still yesterday", () => {
    // 30 Sep 18:40 UTC = 1 Oct 00:10 IST (Thursday).
    const r = findSlots(
      input({ window: { from: "2026-09-30", to: "2026-10-02" }, now: new Date("2026-09-30T18:40:00Z") }),
    );
    expect(at(r)).toBe("2026-10-01 09:00");
    expect(r.kind !== "none" && r.first.startsAt).toBe("2026-10-01T03:30:00.000Z");
  });

  it("walks across a month end", () => {
    const r = findSlots(
      input({
        window: { from: "2026-09-30", to: "2026-10-03" },
        now: IST("2026-09-30", "16:30"),
      }),
    );
    expect(at(r)).toBe("2026-10-01 09:00");
    // One per later day first (2 Oct, 3 Oct), then other times to reach 3.
    expect(r.kind === "in_window" && r.alternatives.slice(0, 2).map((s) => s.date)).toEqual(["2026-10-02", "2026-10-03"]);
  });

  it("a block crossing midnight covers both days", () => {
    // 30 Sep 22:00 → 1 Oct 10:00 IST.
    const r = findSlots(
      input({
        window: { from: "2026-10-01", to: "2026-10-01" },
        blocked: [{ kind: "one_off", label: "Night duty", startsAt: iso("2026-09-30", "22:00"), endsAt: iso("2026-10-01", "10:00") }],
      }),
    );
    expect(at(r)).toBe("2026-10-01 10:00");
  });
});

describe("freeSlotsByDay (the 'choose a different slot' list)", () => {
  it("groups free times by day, capped per day", () => {
    const groups = freeSlotsByDay(
      input({ appointments: [{ startsAt: iso("2026-09-28", "09:00"), durationMin: 60 }] }),
      { maxPerDay: 3 },
    );
    expect(groups.map((g) => g.date)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(groups[0]!.slots.map((s) => s.time)).toEqual(["10:00", "10:15", "10:30"]);
  });

  it("leaves out days with nothing free", () => {
    const groups = freeSlotsByDay(input({ window: { from: "2026-09-26", to: "2026-09-28" }, now: IST("2026-09-26", "17:00") }), {
      maxPerDay: 3,
    });
    expect(groups.map((g) => g.date)).toEqual(["2026-09-28"]);
  });
});

describe("checkSlot (a time the PG picks by hand)", () => {
  const base = input({
    appointments: [{ startsAt: iso("2026-09-28", "10:00"), durationMin: 30, label: "Rahul Sharma" }],
    blocked: [{ kind: "weekly", label: "Seminar", weekday: 3, startTime: "09:00", endTime: "11:00" }],
  });

  it("is fine inside timings with no clash", () => {
    expect(checkSlot(base, "2026-09-28", "11:00", 60)).toEqual([]);
  });

  it("names the appointment it clashes with", () => {
    const problems = checkSlot(base, "2026-09-28", "09:45", 30);
    expect(problems).toEqual([
      { kind: "clash", label: "Rahul Sharma", startsAt: iso("2026-09-28", "10:00"), durationMin: 30 },
    ]);
    expect(describeProblem(problems[0]!, "2026-09-26")).toBe("Clashes with Rahul Sharma at 10:00 AM (30 min)");
  });

  it("names the blocked time", () => {
    const problems = checkSlot(base, "2026-09-30", "10:00", 30);
    expect(problems).toEqual([{ kind: "blocked", label: "Seminar" }]);
    expect(describeProblem(problems[0]!, "2026-09-26")).toBe("During your blocked time: Seminar");
  });

  it("says when it's outside clinic timings or a day off", () => {
    expect(checkSlot(base, "2026-09-28", "12:30", 60)).toEqual([
      { kind: "outside_hours", sessions: "9:00 AM–1:00 PM, 2:00 PM–4:00 PM" },
    ]);
    expect(describeProblem(checkSlot(base, "2026-09-28", "12:30", 60)[0]!, "2026-09-26")).toBe(
      "Outside your clinic timings (9:00 AM–1:00 PM, 2:00 PM–4:00 PM)",
    );
    expect(checkSlot(base, "2026-09-27", "10:00", 30)).toEqual([{ kind: "day_off", weekday: "Sunday" }]);
    expect(describeProblem({ kind: "day_off", weekday: "Sunday" }, "2026-09-26")).toBe("Sunday isn't one of your working days");
  });

  it("says when it's in the past", () => {
    expect(checkSlot(base, "2026-09-26", "09:00", 30)).toEqual([{ kind: "past" }]);
  });

  it("can report several problems at once", () => {
    const kinds = checkSlot(
      { ...base, appointments: [{ startsAt: iso("2026-09-30", "10:00"), durationMin: 30, label: "Neha" }] },
      "2026-09-30",
      "10:00",
      30,
    ).map((p) => p.kind);
    expect(kinds.sort()).toEqual(["blocked", "clash"]);
  });

  it("ignores the appointment being moved", () => {
    const moving = input({
      appointments: [{ id: "a1", startsAt: iso("2026-09-28", "10:00"), durationMin: 30, label: "Rahul Sharma" }],
      excludeAppointmentIds: ["a1"],
    });
    expect(checkSlot(moving, "2026-09-28", "10:00", 30)).toEqual([]);
    expect(at(findSlots({ ...moving, window: { from: "2026-09-28", to: "2026-09-28" }, now: IST("2026-09-28", "09:50") }))).toBe(
      "2026-09-28 10:00",
    );
  });
});
