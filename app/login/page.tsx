import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthShell } from "@/components/layout/AuthShell";
import { LegalLinks } from "@/components/layout/LegalPage";
import { isSignInErrorCode, signInErrorMessage } from "@/lib/auth/errors";
import { detectInAppBrowser } from "@/lib/auth/in-app-browser";
import { safeNextPath } from "@/lib/auth/routes";
import { testSignInEnabled } from "@/lib/auth/test-sign-in";
import { EmailSignIn } from "./EmailSignIn";
import { GoogleSignIn } from "./GoogleSignIn";
import { OpenInBrowser } from "./OpenInBrowser";
import { TestSignIn } from "./TestSignIn";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in: "Continue with Google", or email and password. New PGs get an
 * account either way. Inside WhatsApp, Instagram and other in-app browsers
 * (where Google refuses to sign anyone in) the Google button gives way to
 * "Open in Chrome / Safari"; email works there as it is.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = safeNextPath(next);
  const inApp = detectInAppBrowser((await headers()).get("user-agent"));
  const errorText = isSignInErrorCode(error) ? signInErrorMessage(error) : null;

  return (
    <AuthShell title="Sign in" subtitle="New here? Either way sets you up in a minute.">
      <div className="space-y-6">
        {inApp ? (
          <>
            {errorText && (
              <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
                {errorText}
              </p>
            )}
            <OpenInBrowser app={inApp.app} platform={inApp.platform} next={safeNext} />
          </>
        ) : (
          <GoogleSignIn next={safeNext} initialError={errorText} />
        )}

        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
          <span className="h-px flex-1 bg-border" aria-hidden />
          or use email
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <EmailSignIn next={safeNext} />
      </div>
      {testSignInEnabled() && <TestSignIn next={safeNext} />}
      <LegalLinks className="mt-auto pt-6" />
    </AuthShell>
  );
}
