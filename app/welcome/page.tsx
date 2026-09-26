import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePg } from "@/lib/pg/require";
import { HOME_PATH } from "@/lib/auth/routes";
import { WelcomeGuide } from "./WelcomeGuide";

export const metadata: Metadata = { title: "Welcome" };

/**
 * The first-run guide, shown once after onboarding (the tabs send a PG here
 * until it's seen). `?replay=1` from Settings shows it again.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ replay?: string }> }) {
  const pg = await requirePg();
  const { replay } = await searchParams;
  const isReplay = replay === "1";
  if (pg.guideSeen && !isReplay) redirect(HOME_PATH);
  const firstName = pg.fullName.replace(/^dr\.?\s+/i, "").split(/\s+/)[0] ?? pg.fullName;
  return <WelcomeGuide firstName={firstName} doneHref={isReplay ? "/settings" : HOME_PATH} />;
}
