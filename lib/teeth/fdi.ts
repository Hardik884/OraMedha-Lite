/**
 * FDI (two-digit) tooth notation.
 *
 *   First digit = quadrant. 1–4 permanent (upper right, upper left, lower left,
 *   lower right), 5–8 primary (same order).
 *   Second digit = tooth, counted from the midline: 1–8 permanent, 1–5 primary.
 *
 * A case may involve more than one tooth ("11, 21"), so input is a list.
 * This is dental notation, not clinical judgement — it holds for every
 * specialty.
 */
export type TeethParseResult =
  | { ok: true; teeth: string[]; normalized: string }
  | { ok: false; error: string };

const MAX_TEETH = 16;

export function isFdiTooth(code: string): boolean {
  if (!/^\d\d$/.test(code)) return false;
  const quadrant = Number(code[0]);
  const tooth = Number(code[1]);
  if (quadrant >= 1 && quadrant <= 4) return tooth >= 1 && tooth <= 8;
  if (quadrant >= 5 && quadrant <= 8) return tooth >= 1 && tooth <= 5;
  return false;
}

/**
 * Accepts "36", "11, 21", "11 21", "11/21", "11.21" (the phone's number pad
 * has "." but not always ","); returns the list, de-duplicated.
 */
export function parseTeeth(input: string): TeethParseResult {
  const tokens = input
    .split(/[\s,;/+&.]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return { ok: false, error: "Enter the tooth number" };

  const teeth: string[] = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      return { ok: false, error: "Use FDI numbers, e.g. 36 or 11, 21" };
    }
    if (!isFdiTooth(token)) {
      return { ok: false, error: `${token} isn't an FDI tooth number` };
    }
    if (!teeth.includes(token)) teeth.push(token);
  }

  if (teeth.length > MAX_TEETH) return { ok: false, error: `At most ${MAX_TEETH} teeth` };

  return { ok: true, teeth, normalized: teeth.join(", ") };
}
