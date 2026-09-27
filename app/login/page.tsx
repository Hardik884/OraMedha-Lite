import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthShell } from "@/components/layout/AuthShell";
import { isSignInErrorCode, signInErrorMessage } from "@/lib/auth/errors";
import { detectInAppBrowser } from "@/lib/auth/in-app-browser";
import { safeNextPath } from "@/lib/auth/routes";
import { testSignInEnabled } from "@/lib/auth/test-sign-in";
import { GoogleSignIn } from "./GoogleSignIn";
import { OpenInBrowser } from "./OpenInBrowser";
import { TestSignIn } from "./TestSignIn";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in: one "Continue with Google" button. New PGs get an account the
 * same way. Inside WhatsApp, Instagram and other in-app browsers (where
 * Google refuses to sign anyone in) it asks for Chrome or Safari instead.
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
    <AuthShell
      title={inApp ? "Open in your browser" : "Sign in"}
      subtitle={
        inApp
          ? "Google doesn't allow signing in from inside another app."
          : "Use your Google account. New here? The same button sets you up."
      }
    >
      {inApp ? (
        <OpenInBrowser app={inApp.app} platform={inApp.platform} next={safeNext} />
      ) : (
        <GoogleSignIn next={safeNext} initialError={errorText} />
      )}
      {testSignInEnabled() && <TestSignIn next={safeNext} />}
    </AuthShell>
  );
}
