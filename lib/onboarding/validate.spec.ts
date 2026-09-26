import { describe, expect, it } from "vitest";
import { validateOnboarding } from "./validate";

const SPECIALTY = "3f1c2a8e-6b1d-4c1e-9a7b-2f0e5d4c3b2a";

describe("validateOnboarding", () => {
  it("accepts and tidies a complete form", () => {
    expect(
      validateOnboarding({ fullName: "  Dr  Riya   Singh ", college: "Govt Dental College ", specialtyId: SPECIALTY }),
    ).toEqual({
      ok: true,
      value: { fullName: "Dr Riya Singh", college: "Govt Dental College", specialtyId: SPECIALTY },
    });
  });

  it("reports every missing field at once", () => {
    const result = validateOnboarding({ fullName: " ", college: "", specialtyId: "" });
    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "Enter your name",
        college: "Enter your college",
        specialtyId: "Choose your specialty",
      },
    });
  });

  it("rejects values the database would refuse", () => {
    const result = validateOnboarding({
      fullName: "x".repeat(101),
      college: "y".repeat(151),
      specialtyId: "not-a-uuid",
    });
    expect(result.ok).toBe(false);
  });

  it("treats non-strings as empty", () => {
    expect(validateOnboarding({ fullName: 42, college: null, specialtyId: undefined }).ok).toBe(false);
  });
});
