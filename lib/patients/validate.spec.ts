import { describe, expect, it } from "vitest";
import { validateNewCase, validateNewPatient } from "./validate";

const CASE_TYPE = "3f1c2a8e-6b1d-4c1e-9a7b-2f0e5d4c3b2a";

const complete = {
  fullName: " Sneha  Kapoor ",
  phone: "98765 43210",
  age: "24",
  opdNumber: " 1289 ",
  tooth: "36",
  caseTypeId: CASE_TYPE,
};

describe("validateNewPatient", () => {
  it("accepts and tidies a complete form", () => {
    expect(validateNewPatient(complete, true)).toEqual({
      ok: true,
      value: {
        fullName: "Sneha Kapoor",
        phone: "9876543210",
        age: 24,
        opdNumber: "1289",
        tooth: "36",
        caseTypeId: CASE_TYPE,
      },
    });
  });

  it("needs only name, phone, tooth and case type", () => {
    const result = validateNewPatient({ ...complete, age: "", opdNumber: "" }, true);
    expect(result.ok && result.value.age).toBe(null);
    expect(result.ok && result.value.opdNumber).toBe(null);
  });

  it("reports every problem at once", () => {
    const result = validateNewPatient({}, true);
    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "Enter the patient's name",
        phone: "Enter the patient's mobile number",
        caseTypeId: "Choose the case type",
        tooth: "Enter the tooth number",
      },
    });
  });

  it("rejects a bad age", () => {
    expect(validateNewPatient({ ...complete, age: "two" }, true).ok).toBe(false);
    expect(validateNewPatient({ ...complete, age: "130" }, true).ok).toBe(false);
  });

  it("rejects a non-FDI tooth", () => {
    const result = validateNewPatient({ ...complete, tooth: "19" }, true);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.tooth).toBe("19 isn't an FDI tooth number");
  });
});

describe("validateNewCase", () => {
  it("allows no tooth when the case type does not need one", () => {
    expect(validateNewCase({ tooth: "", caseTypeId: CASE_TYPE }, false)).toEqual({
      ok: true,
      value: { tooth: null, caseTypeId: CASE_TYPE },
    });
  });

  it("still checks a tooth that was typed, even when optional", () => {
    expect(validateNewCase({ tooth: "99", caseTypeId: CASE_TYPE }, false).ok).toBe(false);
  });

  it("normalises a list of teeth", () => {
    const result = validateNewCase({ tooth: "11 21", caseTypeId: CASE_TYPE }, true);
    expect(result.ok && result.value.tooth).toBe("11, 21");
  });
});
