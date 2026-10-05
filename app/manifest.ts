import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme/colors";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/brand/name";

/**
 * PWA manifest — served at /manifest.webmanifest and linked automatically.
 *
 * Colours come from the design tokens (via lib/theme/colors.ts): the splash
 * screen and title bar use the page background, so launching the installed
 * app goes straight from splash to Today without a colour jump.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: "Patients, appointments, case progress and logbook for dental PGs.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.light.background,
    theme_color: THEME_COLORS.light.background,
    categories: ["medical", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
