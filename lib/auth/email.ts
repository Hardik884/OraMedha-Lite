/**
 * Email + password sign-in, the other way in beside Google.
 *
 * Validation mirrors Supabase Auth's own rules closely enough that a form
 * that passes here is not refused there for a reason we could have caught,
 * and errors map Supabase's codes to short sentences for PGs. No message
 * ever says whether an email has an account (that would let anyone probe
 * who uses the app).
 */
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt, which Supabase Auth uses, ignores everything after 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72;

export type CredentialErrors = { email?: string; password?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed, lower-cased email — what we send to Supabase. */
export function cleanEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateEmail(email: string): string | undefined {
  if (!email) return "Enter your email";
  if (email.length > 254 || !EMAIL.test(email)) return "Enter a valid email, like name@gmail.com";
  return undefined;
}

/** For a new password (sign-up, reset, change). Signing in only needs one typed. */
export function validateNewPassword(password: string): string | undefined {
  if (!password) return "Choose a password";
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) return "That password is too long";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers";
  return undefined;
}

export function validateCredentials(
  raw: { email: unknown; password: unknown },
  mode: "sign-in" | "sign-up",
): { ok: true; email: string; password: string } | { ok: false; errors: CredentialErrors } {
  const email = cleanEmail(raw.email);
  const password = typeof raw.password === "string" ? raw.password : "";
  const errors: CredentialErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = mode === "sign-up" ? validateNewPassword(password) : password ? undefined : "Enter your password";
  if (passwordError) errors.password = passwordError;
  return emailError || passwordError ? { ok: false, errors } : { ok: true, email, password };
}

/** Supabase Auth error code → a sentence for the PG. */
export function emailAuthError(code: string | undefined, message?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them, or tap Forgot password.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you. Can't find it? Send it again below.";
    case "weak_password":
      return `Choose a stronger password: at least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`;
    case "same_password":
      return "That's your current password. Choose a new one.";
    case "email_address_invalid":
      return "Enter a valid email, like name@gmail.com";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Email sign-up isn't switched on yet. Use Continue with Google, or contact the OraMedha team.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with this email. Sign in instead, or tap Forgot password.";
    case "reauthentication_needed":
      return "For your safety, sign out and in again, then change your password.";
  }
  const m = (message ?? "").toLowerCase();
  if (m.includes("fetch") || m.includes("network")) return "Couldn't reach OraMedha. Check your internet and try again.";
  return "Something went wrong. Please try again.";
}

/** Links in our emails (confirm, reset password): the Supabase types /auth/confirm accepts. */
export const EMAIL_LINK_TYPES = ["email", "signup", "recovery", "email_change", "invite", "magiclink"] as const;
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function isEmailLinkType(value: unknown): value is EmailLinkType {
  return typeof value === "string" && (EMAIL_LINK_TYPES as readonly string[]).includes(value);
}
