"use server";

import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/lib/auth/after-sign-in";
import { safeNextPath } from "@/lib/auth/routes";
import { isTestEmail, TEST_PASSWORD, testSignInEnabled } from "@/lib/auth/test-sign-in";

export type TestSignInState = { error?: string };

/**
 * LOCAL TEST SERVER ONLY (see lib/auth/test-sign-in.ts): signs in a
 * throwaway test PG by email, creating them on first use. Refused with a 404
 * anywhere else — including against the hosted project.
 */
export async function testSignIn(_prev: TestSignInState, formData: FormData): Promise<TestSignInState> {
  if (!testSignInEnabled()) notFound();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!isTestEmail(email)) return { error: "Use a test address ending in .test, e.g. pg1@oramedha.test" };

  const supabase = await createServerClient();
  let signIn = await supabase.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signIn.error?.code === "invalid_credentials") {
    // First time for this address: create it, with a name for onboarding to
    // pre-fill, the way Google provides one.
    const signUp = await supabase.auth.signUp({
      email,
      password: TEST_PASSWORD,
      options: { data: { full_name: "Test PG" } },
    });
    if (signUp.error) return { error: `Couldn't create the test PG (${signUp.error.code ?? "error"}).` };
    signIn = await supabase.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  }
  if (signIn.error || !signIn.data.user) {
    return { error: `Couldn't sign in (${signIn.error?.code ?? "error"}).` };
  }

  redirect(await destinationFor(supabase, signIn.data.user.id, next));
}
