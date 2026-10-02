"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/lib/auth/after-sign-in";
import { cleanEmail, emailAuthError, validateCredentials, validateEmail } from "@/lib/auth/email";
import { authCallbackUrl, safeNextPath, SET_PASSWORD_PATH } from "@/lib/auth/routes";

/**
 * Email + password sign-in, sign-up, confirmation resend and reset link.
 * Run on the server so the session lands in cookies the same way as Google
 * sign-in. Nothing here logs an email or password.
 */
export type EmailFormState = {
  errors?: { email?: string; password?: string };
  formError?: string;
  /** Sent a confirmation or reset email: show "check your inbox". */
  sentTo?: string;
  /** Offer "Send the confirmation email again". */
  canResend?: boolean;
  /** Echoed so a failed submit keeps what was typed (never the password). */
  email?: string;
};

/** This site's own address, for links in emails. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signInWithEmail(_prev: EmailFormState, formData: FormData): Promise<EmailFormState> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const result = validateCredentials({ email: formData.get("email"), password: formData.get("password") }, "sign-in");
  const email = cleanEmail(formData.get("email"));
  if (!result.ok) return { errors: result.errors, email };

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: result.email, password: result.password });
  if (error || !data.user) {
    return {
      formError: emailAuthError(error?.code, error?.message),
      canResend: error?.code === "email_not_confirmed",
      email,
    };
  }
  redirect(await destinationFor(supabase, data.user.id, next));
}

export async function signUpWithEmail(_prev: EmailFormState, formData: FormData): Promise<EmailFormState> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const result = validateCredentials({ email: formData.get("email"), password: formData.get("password") }, "sign-up");
  const email = cleanEmail(formData.get("email"));
  if (!result.ok) return { errors: result.errors, email };

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.email,
    password: result.password,
    // Used only if the confirmation email still has Supabase's default link.
    options: { emailRedirectTo: authCallbackUrl(await siteOrigin(), next) },
  });
  if (error) return { formError: emailAuthError(error.code, error.message), email };

  // Email confirmation off: signed in already.
  if (data.session && data.user) redirect(await destinationFor(supabase, data.user.id, next));

  // Confirmation on: check your inbox. Supabase answers the same way when the
  // email already has an account, so nobody can probe who uses the app.
  return { sentTo: result.email, email };
}

export async function resendConfirmation(_prev: EmailFormState, formData: FormData): Promise<EmailFormState> {
  const email = cleanEmail(formData.get("email"));
  const emailError = validateEmail(email);
  if (emailError) return { errors: { email: emailError }, email };
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authCallbackUrl(await siteOrigin(), next) },
  });
  if (error) return { formError: emailAuthError(error.code, error.message), email };
  return { sentTo: email, email };
}

export async function sendResetLink(_prev: EmailFormState, formData: FormData): Promise<EmailFormState> {
  const email = cleanEmail(formData.get("email"));
  const emailError = validateEmail(email);
  if (emailError) return { errors: { email: emailError }, email };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Used only if the reset email still has Supabase's default link.
    redirectTo: authCallbackUrl(await siteOrigin(), SET_PASSWORD_PATH),
  });
  // Same answer whether or not the email has an account. Only a rate limit
  // or an outage is worth telling the PG about.
  if (error && (error.code?.startsWith("over_") || error.status === 0 || (error.status ?? 0) >= 500)) {
    return { formError: emailAuthError(error.code, error.message), email };
  }
  return { sentTo: email, email };
}
