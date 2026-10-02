import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { getCurrentPg } from "@/lib/pg/current";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Choose a password" };

/**
 * Choose a new password: after opening a reset link (which signs the PG in),
 * or from Settings → Password (also how a Google PG adds one).
 */
export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const current = await getCurrentPg();
  if (current.state === "signed-out") redirect(LOGIN_PATH);
  const fromSettings = (await searchParams).from === "settings";
  return (
    <AuthShell
      title={fromSettings ? "Password" : "Choose a new password"}
      subtitle="Use it with your email to sign in. Google sign-in keeps working too."
    >
      <SetPasswordForm fromSettings={fromSettings} />
    </AuthShell>
  );
}
