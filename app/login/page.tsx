import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/AuthShell";
import { safeNextPath } from "@/lib/auth/routes";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    // Non-breaking hyphen (U+2011) so "6-digit" never splits across lines.
    <AuthShell title="Sign in" subtitle={"Use your mobile number. We'll text you a 6‑digit code."}>
      <LoginForm next={safeNextPath(next)} />
    </AuthShell>
  );
}
