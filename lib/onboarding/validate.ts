/**
 * First-login onboarding: who the PG is. Limits mirror the pg_profile table's
 * CHECK constraints, so a value that passes here is never refused there.
 */
export type OnboardingInput = {
  fullName: string;
  college: string;
  specialtyId: string;
};

export type OnboardingErrors = Partial<Record<keyof OnboardingInput, string>>;

export type OnboardingResult =
  | { ok: true; value: OnboardingInput }
  | { ok: false; errors: OnboardingErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trims and collapses runs of spaces ("Dr  Riya " → "Dr Riya"). */
function tidy(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateOnboarding(raw: {
  fullName?: unknown;
  college?: unknown;
  specialtyId?: unknown;
}): OnboardingResult {
  const value: OnboardingInput = {
    fullName: tidy(raw.fullName),
    college: tidy(raw.college),
    specialtyId: tidy(raw.specialtyId),
  };
  const errors: OnboardingErrors = {};

  if (value.fullName.length < 2) errors.fullName = "Enter your name";
  else if (value.fullName.length > 100) errors.fullName = "Name is too long";

  if (value.college.length < 2) errors.college = "Enter your college";
  else if (value.college.length > 150) errors.college = "College name is too long";

  if (!UUID.test(value.specialtyId)) errors.specialtyId = "Choose your specialty";

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}
