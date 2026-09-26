import "server-only";
import { redirect } from "next/navigation";
import { getCurrentPg, type CurrentPg } from "./current";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/routes";

/** The signed-in, onboarded PG — or a redirect to wherever they need to go first. */
export async function requirePg(): Promise<CurrentPg> {
  const current = await getCurrentPg();
  if (current.state === "signed-out") redirect(LOGIN_PATH);
  if (current.state === "needs-onboarding") redirect(ONBOARDING_PATH);
  return current.pg;
}
