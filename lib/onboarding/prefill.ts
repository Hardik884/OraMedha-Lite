/**
 * The PG's name as Google gave it, to pre-fill onboarding (still editable).
 * Supabase puts it in the user's metadata as `full_name` (and `name`).
 * Returns "" when there is nothing usable.
 */
export function nameFromProfile(metadata: Record<string, unknown> | null | undefined): string {
  for (const key of ["full_name", "name"]) {
    const value = metadata?.[key];
    if (typeof value !== "string") continue;
    const tidy = value.replace(/\s+/g, " ").trim();
    // Same limits as onboarding: a name that would be refused isn't offered.
    if (tidy.length >= 2 && tidy.length <= 100) return tidy;
  }
  return "";
}
