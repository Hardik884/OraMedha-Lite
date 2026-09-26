/**
 * The bottom-navigation tabs. The PG lives in these three places; everything
 * else (patient, update visit, settings) opens on top of one of them.
 */
export const NAV_TABS = [
  { key: "today", label: "Today", href: "/today" },
  { key: "patients", label: "Patients", href: "/patients" },
  { key: "progress", label: "Progress", href: "/progress" },
] as const;

export type NavTabKey = (typeof NAV_TABS)[number]["key"];

/**
 * Which tab a path belongs to. A nested screen (e.g. /patients/123) keeps its
 * parent tab highlighted, so the PG always knows where "back" leads.
 */
export function activeTabFor(pathname: string): NavTabKey | null {
  const tab = NAV_TABS.find(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );
  return tab?.key ?? null;
}
