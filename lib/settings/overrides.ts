/**
 * "My clinical defaults": a PG's own duration / gaps for a stage or modifier,
 * layered over the template.
 *
 * Only what DIFFERS from the template is stored. Typing the template's own
 * value (or leaving a field blank) stores NULL for it, so the PG keeps
 * following the template if it is later corrected. When nothing differs, the
 * override row is deleted — that is what "reset to default" means.
 *
 * Stages also have an optional gap after a PARTIAL visit; when neither the
 * template nor the PG sets one, the normal gap is used (see lib/engine).
 */
export type TemplateValues = {
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  partialGapMinDays?: number | null;
  partialGapMaxDays?: number | null;
};

export type OverrideValues = {
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  partialGapMinDays?: number | null;
  partialGapMaxDays?: number | null;
};

export type Effective = {
  durationMin: number | null;
  gapMinDays: number | null;
  gapMaxDays: number | null;
  partialGapMinDays: number | null;
  partialGapMaxDays: number | null;
  customDuration: boolean;
  customGap: boolean;
  customPartialGap: boolean;
};

export function effectiveValues(template: TemplateValues, override: OverrideValues | null): Effective {
  const customDuration = override?.durationMin != null;
  const customGap = override?.gapMinDays != null;
  const customPartialGap = override?.partialGapMinDays != null;
  return {
    durationMin: customDuration ? override!.durationMin : template.durationMin,
    gapMinDays: customGap ? override!.gapMinDays : template.gapMinDays,
    gapMaxDays: customGap ? override!.gapMaxDays : template.gapMaxDays,
    partialGapMinDays: customPartialGap ? override!.partialGapMinDays! : (template.partialGapMinDays ?? null),
    partialGapMaxDays: customPartialGap ? override!.partialGapMaxDays! : (template.partialGapMaxDays ?? null),
    customDuration,
    customGap,
    customPartialGap,
  };
}

export type OverrideInput = {
  durationMin: string;
  gapMinDays: string;
  gapMaxDays: string;
  partialGapMinDays?: string;
  partialGapMaxDays?: string;
};
type Field = keyof OverrideInput;

const MAX_GAP_DAYS = 365;

function parseWhole(value: string | undefined): number | null | "invalid" {
  const v = (value ?? "").trim();
  if (!v) return null;
  return /^\d{1,4}$/.test(v) ? Number(v) : "invalid";
}

/** Reads a min–max pair of day counts; both empty = "not set". */
function parseGapPair(
  minInput: string | undefined,
  maxInput: string | undefined,
  minField: Field,
  maxField: Field,
  errors: Partial<Record<Field, string>>,
): { min: number | null; max: number | null } {
  const min = parseWhole(minInput);
  const max = parseWhole(maxInput);
  if (min === "invalid" || (min !== null && min > MAX_GAP_DAYS)) errors[minField] = "Days, 0–365";
  if (max === "invalid" || (max !== null && max > MAX_GAP_DAYS)) errors[maxField] = "Days, 0–365";
  if (errors[minField] || errors[maxField]) return { min: null, max: null };
  if ((min === null) !== (max === null)) {
    errors[min === null ? minField : maxField] = "Fill in both, or leave both empty";
    return { min: null, max: null };
  }
  if (min !== null && max !== null && min > max) {
    errors[maxField] = "Can't be less than the earliest";
    return { min: null, max: null };
  }
  return { min: min as number | null, max: max as number | null };
}

/**
 * @param gapEditable     false for a final stage — there is no "next stage" gap.
 * @param partialEditable true for stages — they may have a gap after a Partial visit.
 * @returns the values to STORE (NULL where they match the template) and
 *          whether the row should simply be removed.
 */
export function validateOverride(
  input: OverrideInput,
  template: TemplateValues,
  gapEditable: boolean,
  partialEditable = false,
):
  | { ok: true; value: OverrideValues; isReset: boolean }
  | { ok: false; errors: Partial<Record<Field, string>> } {
  const errors: Partial<Record<Field, string>> = {};

  const duration = parseWhole(input.durationMin);
  if (duration === "invalid" || (duration !== null && (duration < 5 || duration > 480))) {
    errors.durationMin = "Minutes, between 5 and 480";
  }

  const gap = gapEditable
    ? parseGapPair(input.gapMinDays, input.gapMaxDays, "gapMinDays", "gapMaxDays", errors)
    : { min: null, max: null };
  const partial = partialEditable
    ? parseGapPair(input.partialGapMinDays, input.partialGapMaxDays, "partialGapMinDays", "partialGapMaxDays", errors)
    : { min: null, max: null };

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const durationMin = duration === template.durationMin ? null : (duration as number | null);
  const sameGap = gap.min === template.gapMinDays && gap.max === template.gapMaxDays;
  const samePartial =
    partial.min === (template.partialGapMinDays ?? null) && partial.max === (template.partialGapMaxDays ?? null);

  const value: OverrideValues = {
    durationMin,
    gapMinDays: sameGap ? null : gap.min,
    gapMaxDays: sameGap ? null : gap.max,
    partialGapMinDays: samePartial ? null : partial.min,
    partialGapMaxDays: samePartial ? null : partial.max,
  };
  return {
    ok: true,
    value,
    isReset: value.durationMin === null && value.gapMinDays === null && value.partialGapMinDays === null,
  };
}

/** "3–7 days", "7 days", "1 day", "same day", or "—" for none. */
export function describeGap(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null || max == null) return "—";
  const unit = (n: number) => (n === 1 ? "day" : "days");
  if (min === max) return min === 0 ? "same day" : `${min} ${unit(min)}`;
  return `${min}–${max} ${unit(max)}`;
}
