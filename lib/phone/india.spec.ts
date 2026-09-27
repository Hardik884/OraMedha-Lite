import { describe, expect, it } from "vitest";
import { formatIndianMobile, parseIndianMobile } from "./india";

describe("parseIndianMobile", () => {
  it.each([
    "9876543210",
    "98765 43210",
    "+91 98765 43210",
    "+91-98765-43210",
    "919876543210",
    "09876543210",
    "0091 9876543210",
    "(98765) 43210",
  ])("accepts %s", (input) => {
    expect(parseIndianMobile(input)).toEqual({
      ok: true,
      national: "9876543210",
      e164: "+919876543210",
    });
  });

  it("asks for a number when empty", () => {
    expect(parseIndianMobile("  ")).toEqual({ ok: false, error: "Enter your mobile number" });
  });

  it("rejects letters", () => {
    expect(parseIndianMobile("98765abcde").ok).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(parseIndianMobile("98765432")).toEqual({
      ok: false,
      error: "Enter a 10-digit mobile number",
    });
  });

  it("rejects numbers that cannot be Indian mobiles", () => {
    expect(parseIndianMobile("1234567890").ok).toBe(false);
    expect(parseIndianMobile("5876543210").ok).toBe(false);
  });
});

describe("formatIndianMobile", () => {
  it("splits 5 + 5", () => {
    expect(formatIndianMobile("9876543210")).toBe("98765 43210");
  });
});
