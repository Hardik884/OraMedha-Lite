/**
 * Theme constants — shared by the no-flash inline script, the ThemeProvider,
 * and the theme toggle.
 *
 * Keep this module free of React and of any browser-only API access at module
 * scope: the inline script in the root layout mirrors these literals, and the
 * values are also read on the server while rendering.
 */

/** Separate from the main OraMedha app's key, so the two never fight. */
export const THEME_STORAGE_KEY = "oramedha-lite-theme";

/** What the user picked. `system` defers to the OS preference. */
export type ThemePreference = "light" | "dark" | "system";

/** What is actually painted. `system` always resolves to one of these. */
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "light",
  "dark",
  "system",
] as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * System is the default in Resident. The main app defaults to Light only to protect
 * existing users from a sudden change; Resident has no such users, and on a phone
 * following the OS (which many PGs set to dark at night) is what people expect.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
