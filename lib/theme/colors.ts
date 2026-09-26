/**
 * Theme colours as plain strings — for the few places that cannot read a CSS
 * variable: the PWA manifest, the `theme-color` meta tag Next.js renders on the
 * server, and the icon generator.
 *
 * These MIRROR tokens in app/globals.css; they are not a second palette.
 * lib/theme/colors.spec.ts fails if they drift from the stylesheet, so change
 * the token in globals.css first and then update the value here.
 */
export const THEME_COLORS = {
  light: {
    /** --color-background (light) */
    background: "#F6F8F6",
    /** --color-text-primary (light) — the icon tile. */
    textPrimary: "#151918",
  },
  dark: {
    /** --color-background (dark) */
    background: "#0F1412",
    /** --color-text-primary (dark) — the mark on the icon tile. */
    textPrimary: "#F1F5F3",
  },
} as const;
