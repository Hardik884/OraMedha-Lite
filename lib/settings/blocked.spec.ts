import { describe, expect, it } from "vitest";
import { describeBlockedTime, isCurrentBlock, validateBlockedTime } from "./blocked";

const TODAY = "2026-09-26"; // Saturday

describe("validateBlockedTime — one-off", () => {
  it("blocks a whole day in India time", () => {
    expect(
      validateBlockedTime({ kind: "one_off", label: " Exam ", date: "2026-10-03", allDay: true }, TODAY),
    ).toEqual({
      ok: true,
      value: {
        kind: "one_off",
        label: "Exam",
        starts_at: "2026-10-02T18:30:00.000Z",
        ends_at: "2026-10-03T18:30:00.000Z",
        weekday: null,
        start_time: null,
        end_time: null,
      },
    });
  });

  it("blocks several whole days", () => {
    const r = validateBlockedTime(
      { kind: "one_off", label: "Exams", date: "2026-10-03", endDate: "2026-10-05", allDay: true },
      TODAY,
    );
    expect(r.ok && r.value.ends_at).toBe("2026-10-05T18:30:00.000Z");
  });

  it("blocks part of a day", () => {
    const r = validateBlockedTime(
      { kind: "one_off", label: "Viva", date: "2026-10-03", allDay: false, startTime: "10:00", endTime: "12:00" },
      TODAY,
    );
    expect(r.ok && [r.value.starts_at, r.value.ends_at]).toEqual([
      "2026-10-03T04:30:00.000Z",
      "2026-10-03T06:30:00.000Z",
    ]);
  });

  it("refuses bad input", () => {
    expect(validateBlockedTime({ kind: "one_off", label: "", date: "2026-09-20", allDay: true }, TODAY)).toEqual({
      ok: false,
      errors: { label: "Say what it is, e.g. Exam or Seminar", date: "That day has passed" },
    });
    expect(
      validateBlockedTime(
        { kind: "one_off", label: "X", date: "2026-10-03", endDate: "2026-10-01", allDay: true },
        TODAY,
      ),
    ).toEqual({ ok: false, errors: { endDate: "Last day can't be before the first" } });
    expect(
      validateBlockedTime(
        { kind: "one_off", label: "X", date: "2026-10-03", allDay: false, startTime: "12:00", endTime: "10:00" },
        TODAY,
      ),
    ).toEqual({ ok: false, errors: { time: "End must be after start" } });
    expect(
      validateBlockedTime(
        { kind: "one_off", label: "X", date: "2026-10-03", endDate: "2026-10-04", allDay: false, startTime: "09:00", endTime: "10:00" },
        TODAY,
      ),
    ).toEqual({ ok: false, errors: { time: "Several days can only be blocked as whole days" } });
  });
});

describe("validateBlockedTime — weekly", () => {
  it("stores the weekday and wall-clock times", () => {
    expect(
      validateBlockedTime({ kind: "weekly", label: "Seminar", weekday: "3", startTime: "09:00", endTime: "11:00" }, TODAY),
    ).toEqual({
      ok: true,
      value: {
        kind: "weekly",
        label: "Seminar",
        starts_at: null,
        ends_at: null,
        weekday: 3,
        start_time: "09:00",
        end_time: "11:00",
      },
    });
  });

  it("needs a day and a valid time range", () => {
    expect(
      validateBlockedTime({ kind: "weekly", label: "Seminar", weekday: "", startTime: "11:00", endTime: "09:00" }, TODAY),
    ).toEqual({ ok: false, errors: { weekday: "Choose the day", time: "End must be after start" } });
  });
});

describe("describeBlockedTime", () => {
  it("weekly", () => {
    expect(
      describeBlockedTime(
        { kind: "weekly", starts_at: null, ends_at: null, weekday: 3, start_time: "09:00:00", end_time: "11:00:00" },
        TODAY,
      ),
    ).toBe("Every Wednesday · 9:00 AM–11:00 AM");
  });

  it("one whole day, several days, part of a day", () => {
    const base = { kind: "one_off", weekday: null, start_time: null, end_time: null };
    expect(
      describeBlockedTime({ ...base, starts_at: "2026-10-02T18:30:00Z", ends_at: "2026-10-03T18:30:00Z" }, TODAY),
    ).toBe("Sat, 3 Oct · all day");
    expect(
      describeBlockedTime({ ...base, starts_at: "2026-10-02T18:30:00Z", ends_at: "2026-10-05T18:30:00Z" }, TODAY),
    ).toBe("Sat, 3 Oct to Mon, 5 Oct · all day");
    expect(
      describeBlockedTime({ ...base, starts_at: "2026-09-27T04:30:00Z", ends_at: "2026-09-27T06:30:00Z" }, TODAY),
    ).toBe("Tomorrow · 10:00 AM–12:00 PM");
  });
});

describe("isCurrentBlock", () => {
  const now = new Date("2026-09-26T06:00:00Z");
  const base = { weekday: null, start_time: null, end_time: null };
  it("keeps weekly blocks and future one-offs, drops past ones", () => {
    expect(isCurrentBlock({ ...base, kind: "weekly", starts_at: null, ends_at: null }, now)).toBe(true);
    expect(isCurrentBlock({ ...base, kind: "one_off", starts_at: "x", ends_at: "2026-09-27T00:00:00Z" }, now)).toBe(true);
    expect(isCurrentBlock({ ...base, kind: "one_off", starts_at: "x", ends_at: "2026-09-26T05:00:00Z" }, now)).toBe(false);
  });
});
