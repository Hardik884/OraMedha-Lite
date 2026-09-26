import { describe, expect, it } from "vitest";
import { isFdiTooth, parseTeeth } from "./fdi";

describe("isFdiTooth", () => {
  it.each(["11", "18", "21", "28", "31", "38", "41", "48"])("accepts permanent %s", (t) => {
    expect(isFdiTooth(t)).toBe(true);
  });

  it.each(["51", "55", "61", "65", "71", "75", "81", "85"])("accepts primary %s", (t) => {
    expect(isFdiTooth(t)).toBe(true);
  });

  it.each(["10", "19", "29", "56", "86", "91", "01", "00", "1", "111", "a1"])("rejects %s", (t) => {
    expect(isFdiTooth(t)).toBe(false);
  });
});

describe("parseTeeth", () => {
  it("reads a single tooth", () => {
    expect(parseTeeth(" 36 ")).toEqual({ ok: true, teeth: ["36"], normalized: "36" });
  });

  it.each(["11, 21", "11 21", "11/21", "11,21", "11.21", "11 + 21", "11, 21, 11"])(
    "reads a list: %s",
    (input) => {
      expect(parseTeeth(input)).toEqual({ ok: true, teeth: ["11", "21"], normalized: "11, 21" });
    },
  );

  it("asks for a tooth when empty", () => {
    expect(parseTeeth("  ")).toEqual({ ok: false, error: "Enter the tooth number" });
  });

  it("names the wrong number", () => {
    expect(parseTeeth("36, 19")).toEqual({ ok: false, error: "19 isn't an FDI tooth number" });
  });

  it("explains the notation for non-numbers", () => {
    expect(parseTeeth("LL6")).toEqual({ ok: false, error: "Use FDI numbers, e.g. 36 or 11, 21" });
  });
});
