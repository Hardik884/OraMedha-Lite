import type { Metadata } from "next";
import { Gallery } from "./Gallery";

export const metadata: Metadata = {
  title: "UI kit",
  robots: { index: false, follow: false },
};

/**
 * /dev/ui — a hidden page (not linked anywhere) showing every design-system
 * component, for checking the OraMedha look on a real phone in light and dark.
 */
export default function DevUiPage() {
  return <Gallery />;
}
