/**
 * "My clinical defaults": a PG's own duration / gap for a stage or modifier,
 * layered over the template.
 *
 * Only what DIFFERS from the template is stored. Typing the template's own
 * value (or leaving a field blank) stores NULL for it, so the PG keeps
 * following the template if it is later corrected. When nothing differs, the
 * override row is deleted — that is what "reset to default" means.
 */
export type TemplateValues = {
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
};

export type OverrideValues = {
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
};

export type Effective = TemplateValues & { customDuration: boolean; customGap: boolean };

export function effectiveValues(template: TemplateValues, override: OverrideValues | null): Effective {
  const customDuration = override?.durationMin != null;
  const customGap = override?.gapMinDays != null;
  return {
    durationMin: customDuration ? override!.durationMin : template.durationMin,
    gapMinDays: customGap ? override!.gapMinDays : template.gapMinDays,
    gapMaxDays: customGap ? override!.gapMaxDays : template.gapMaxDays,
    customDuration,
    customGap,
  };
}

export type OverrideInput = { durationMin: string; gapMinDays: string; gapMaxDays: string };
type Field = keyof OverrideInput;

const MAX_GAP_DAYS = 365;

function parseWhole(value: string): number | null | "invalid" {
  const v = value.trim();
  if (!v) return null;
  return /^\d{1,4}$/.test(v) ? Number(v) : "invalid";
}

/**
 * @param gapEditable false for a final stage — there is no "next visit" gap.
 * @returns the values to STORE (NULL where they match the template) and
 *          whether the row should simply be removed.
 */
export function validateOverride(
  input: OverrideInput,
  template: TemplateValues,
  gapEditable: boolean,
):
  | { ok: true; value: OverrideValues; isReset: boolean }
  | { ok: false; errors: Partial<Record<Field, string>> } {
  const errors: Partial<Record<Field, string>> = {};

  const duration = parseWhole(input.durationMin);
  if (duration === "invalid" || (duration !== null && (duration < 5 || duration > 480))) {
    errors.durationMin = "Minutes, between 5 and 480";
  }

  let gapMin: number | null = null;
  let gapMax: number | null = null;
  if (gapEditable) {
    const min = parseWhole(input.gapMinDays);
    const max = parseWhole(input.gapMaxDays);
    if (min === "invalid" || (min !== null && min > MAX_GAP_DAYS)) errors.gapMinDays = "Days, 0–365";
    if (max === "invalid" || (max !== null && max > MAX_GAP_DAYS)) errors.gapMaxDays = "Days, 0–365";
    if (!errors.gapMinDays && !errors.gapMaxDays) {
      if ((min === null) !== (max === null)) {
        errors[min === null ? "gapMinDays" : "gapMaxDays"] = "Fill in both, or leave both empty";
      } else if (min !== null && max !== null && min > max) {
        errors.gapMaxDays = "Can't be less than the earliest";
      } else {
        gapMin = min as number | null;
        gapMax = max as number | null;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const durationMin = duration === template.durationMin ? null : (duration as number | null);
  const sameGap = gapMin === template.gapMinDays && gapMax === template.gapMaxDays;
  const value: OverrideValues = {
    durationMin,
    gapMinDays: sameGap ? null : gapMin,
    gapMaxDays: sameGap ? null : gapMax,
  };
  return { ok: true, value, isReset: value.durationMin === null && value.gapMinDays === null };
}

/** "3–7 days", "7 days", "1 day", "same day", or "—" for none. */
export function describeGap(min: number | null, max: number | null): string {
  if (min === null || max === null) return "—";
  const unit = (n: number) => (n === 1 ? "day" : "days");
  if (min === max) return min === 0 ? "same day" : `${min} ${unit(min)}`;
  return `${min}–${max} ${unit(max)}`;
}
