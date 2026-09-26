import { parseIndianMobile } from "@/lib/auth/phone";
import { parseTeeth } from "@/lib/teeth/fdi";

/**
 * New Patient, step 1. Only name, phone, tooth and case type are required;
 * age and OPD number are optional. Limits mirror the database constraints.
 */
export type NewCaseFields = {
  tooth: string;
  caseTypeId: string;
};

export type NewPatientFields = NewCaseFields & {
  fullName: string;
  phone: string;
  age: string;
  opdNumber: string;
};

export type NewPatientValue = {
  fullName: string;
  /** 10 digits, no +91. */
  phone: string;
  age: number | null;
  opdNumber: string | null;
  /** "36" or "11, 21"; null when the case type does not need a tooth. */
  tooth: string | null;
  caseTypeId: string;
};

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type Validation<V, K extends string> =
  | { ok: true; value: V }
  | { ok: false; errors: FieldErrors<K> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tidy(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Tooth + case type — shared by "new patient" and "add a case". */
export function validateNewCase(
  raw: Partial<Record<keyof NewCaseFields, unknown>>,
  toothRequired: boolean,
): Validation<{ tooth: string | null; caseTypeId: string }, keyof NewCaseFields> {
  const errors: FieldErrors<keyof NewCaseFields> = {};
  const caseTypeId = tidy(raw.caseTypeId);
  const toothInput = tidy(raw.tooth);
  let tooth: string | null = null;

  if (!UUID.test(caseTypeId)) errors.caseTypeId = "Choose the case type";

  if (toothInput || toothRequired) {
    const parsed = parseTeeth(toothInput);
    if (parsed.ok) tooth = parsed.normalized;
    else errors.tooth = parsed.error;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: { tooth, caseTypeId } };
}

export function validateNewPatient(
  raw: Partial<Record<keyof NewPatientFields, unknown>>,
  toothRequired: boolean,
): Validation<NewPatientValue, keyof NewPatientFields> {
  const errors: FieldErrors<keyof NewPatientFields> = {};

  const fullName = tidy(raw.fullName);
  if (!fullName) errors.fullName = "Enter the patient's name";
  else if (fullName.length > 100) errors.fullName = "Name is too long";

  const phoneInput = tidy(raw.phone);
  const phoneResult = parseIndianMobile(phoneInput);
  if (!phoneResult.ok) {
    errors.phone = phoneInput ? phoneResult.error : "Enter the patient's mobile number";
  }

  const ageInput = tidy(raw.age);
  let age: number | null = null;
  if (ageInput) {
    if (!/^\d{1,3}$/.test(ageInput) || Number(ageInput) > 120) errors.age = "Enter age in years (0–120)";
    else age = Number(ageInput);
  }

  const opdInput = tidy(raw.opdNumber);
  if (opdInput.length > 40) errors.opdNumber = "OPD number is too long";

  const caseResult = validateNewCase(raw, toothRequired);
  if (!caseResult.ok) Object.assign(errors, caseResult.errors);

  if (Object.keys(errors).length > 0 || !phoneResult.ok || !caseResult.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fullName,
      phone: phoneResult.national,
      age,
      opdNumber: opdInput || null,
      tooth: caseResult.value.tooth,
      caseTypeId: caseResult.value.caseTypeId,
    },
  };
}
