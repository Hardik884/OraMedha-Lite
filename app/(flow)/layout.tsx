import { redirect } from "next/navigation";
import { getCurrentPg } from "@/lib/pg/current";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/routes";

/**
 * Screens that open on top of a tab (patient, new patient, scheduling). No
 * bottom navigation — each has its own back arrow and a pinned main action.
 * Same sign-in and onboarding gate as the tabs.
 */
export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPg();
  if (current.state === "signed-out") redirect(LOGIN_PATH);
  if (current.state === "needs-onboarding") redirect(ONBOARDING_PATH);

  return <div className="min-h-dvh bg-background">{children}</div>;
}
