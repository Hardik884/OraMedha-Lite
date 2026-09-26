/**
 * lib/brand/mark.ts — OraMedha's brand geometry (copied from the main app).
 *
 * The logo is a raster asset: `public/brand/oramedha-mark.png`, an all-black
 * image whose ALPHA channel carries the shape. The logo component paints it
 * with `background-color` through a CSS mask, so one asset follows the theme:
 * near-black on light surfaces, near-white in dark mode.
 *
 * If a vector version of the artwork ever arrives, this is the file to change.
 */

/** The mark asset, served from `public/`. */
export const MARK_SRC = "/brand/oramedha-mark.png";

/** Width divided by height (238/117 from the asset) — a wide, ~2:1 mark. */
export const MARK_ASPECT = 238 / 117;
