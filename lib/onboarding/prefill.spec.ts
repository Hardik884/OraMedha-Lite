import { describe, expect, it } from "vitest";
import { nameFromProfile } from "./prefill";

describe("nameFromProfile", () => {
  it("uses the Google name, tidied", () => {
    expect(nameFromProfile({ full_name: "  Riya   Singh ", name: "Riya" })).toBe("Riya Singh");
    expect(nameFromProfile({ name: "Riya Singh" })).toBe("Riya Singh");
  });

  it("offers nothing when there is no usable name", () => {
    expect(nameFromProfile(null)).toBe("");
    expect(nameFromProfile({})).toBe("");
    expect(nameFromProfile({ full_name: 42 })).toBe("");
    expect(nameFromProfile({ full_name: "R" })).toBe("");
    expect(nameFromProfile({ full_name: "x".repeat(101) })).toBe("");
  });
});
