import { describe, expect, it } from "vitest";
import { describeGap, effectiveValues, validateOverride } from "./overrides";

const TEMPLATE = { durationMin: 60, gapMinDays: 7, gapMaxDays: 14 };
const input = (durationMin = "", gapMinDays = "", gapMaxDays = "") => ({ durationMin, gapMinDays, gapMaxDays });

describe("effectiveValues", () => {
  it("uses the template when there is no override", () => {
    expect(effectiveValues(TEMPLATE, null)).toMatchObject({ ...TEMPLATE, customDuration: false, customGap: false });
  });

  it("marks each overridden value as the PG's own", () => {
    expect(effectiveValues(TEMPLATE, { durationMin: 90, gapMinDays: null, gapMaxDays: null })).toMatchObject({
      durationMin: 90,
      gapMinDays: 7,
      gapMaxDays: 14,
      customDuration: true,
      customGap: false,
    });
  });
});

describe("validateOverride", () => {
  it("stores only what differs from the template", () => {
    expect(validateOverride(input("90", "7", "14"), TEMPLATE, true)).toMatchObject({
      ok: true,
      value: { durationMin: 90, gapMinDays: null, gapMaxDays: null },
      isReset: false,
    });
    expect(validateOverride(input("60", "10", "14"), TEMPLATE, true)).toMatchObject({
      ok: true,
      value: { durationMin: null, gapMinDays: 10, gapMaxDays: 14 },
      isReset: false,
    });
  });

  it("typing the template's values (or blanks) is a reset", () => {
    expect(validateOverride(input("60", "7", "14"), TEMPLATE, true)).toMatchObject({ ok: true, isReset: true });
    expect(validateOverride(input(), TEMPLATE, true)).toMatchObject({ ok: true, isReset: true });
  });

  it("ignores the gap for a final stage", () => {
    const finalStage = { durationMin: 60, gapMinDays: null, gapMaxDays: null };
    expect(validateOverride(input("45", "3", "5"), finalStage, false)).toMatchObject({
      ok: true,
      value: { durationMin: 45, gapMinDays: null, gapMaxDays: null },
      isReset: false,
    });
  });

  it("refuses out-of-range and half-filled values", () => {
    expect(validateOverride(input("2"), TEMPLATE, true)).toEqual({
      ok: false,
      errors: { durationMin: "Minutes, between 5 and 480" },
    });
    expect(validateOverride(input("", "5"), TEMPLATE, true)).toEqual({
      ok: false,
      errors: { gapMaxDays: "Fill in both, or leave both empty" },
    });
    expect(validateOverride(input("", "10", "5"), TEMPLATE, true)).toEqual({
      ok: false,
      errors: { gapMaxDays: "Can't be less than the earliest" },
    });
    expect(validateOverride(input("", "x", "400"), TEMPLATE, true)).toEqual({
      ok: false,
      errors: { gapMinDays: "Days, 0–365", gapMaxDays: "Days, 0–365" },
    });
  });
});

describe("describeGap", () => {
  it.each([
    [3, 7, "3–7 days"],
    [7, 7, "7 days"],
    [1, 1, "1 day"],
    [0, 0, "same day"],
    [0, 2, "0–2 days"],
    [null, null, "—"],
  ] as const)("%s–%s → %s", (min, max, out) => {
    expect(describeGap(min, max)).toBe(out);
  });
});

describe("Partial gap", () => {
  const withPartial = { durationMin: 60, gapMinDays: 7, gapMaxDays: 14, partialGapMinDays: null, partialGapMaxDays: null };
  const full = (partialGapMinDays = "", partialGapMaxDays = "") => ({
    durationMin: "",
    gapMinDays: "",
    gapMaxDays: "",
    partialGapMinDays,
    partialGapMaxDays,
  });

  it("stores the PG's own Partial gap", () => {
    expect(validateOverride(full("2", "5"), withPartial, true, true)).toEqual({
      ok: true,
      value: { durationMin: null, gapMinDays: null, gapMaxDays: null, partialGapMinDays: 2, partialGapMaxDays: 5 },
      isReset: false,
    });
  });

  it("works on a last stage (a partial last stage still needs a next visit)", () => {
    const last = { durationMin: 60, gapMinDays: null, gapMaxDays: null };
    const result = validateOverride(full("3", "7"), last, false, true);
    expect(result.ok && result.value.partialGapMinDays).toBe(3);
  });

  it("is ignored where it doesn't apply (modifiers)", () => {
    const result = validateOverride(full("2", "5"), withPartial, true, false);
    expect(result).toMatchObject({ ok: true, isReset: true });
  });

  it("checks the pair like the normal gap", () => {
    expect(validateOverride(full("5", ""), withPartial, true, true)).toEqual({
      ok: false,
      errors: { partialGapMaxDays: "Fill in both, or leave both empty" },
    });
  });

  it("effectiveValues marks a custom Partial gap", () => {
    expect(
      effectiveValues(withPartial, { durationMin: null, gapMinDays: null, gapMaxDays: null, partialGapMinDays: 1, partialGapMaxDays: 2 }),
    ).toMatchObject({ partialGapMinDays: 1, partialGapMaxDays: 2, customPartialGap: true, customGap: false });
  });
});
