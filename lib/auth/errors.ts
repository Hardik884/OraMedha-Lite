/**
 * Supabase Auth error text is written for developers. PGs get a short,
 * actionable sentence instead. Never includes the PG's email.
 */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("provider") && (m.includes("not enabled") || m.includes("unsupported") || m.includes("disabled"))) {
    return "Google sign-in isn't switched on yet. Please contact the OraMedha team.";
  }
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("flow state")) {
    return "Sign-in has to finish in the same browser it started in. Tap Continue with Google again.";
  }
  if (m.includes("rate") || m.includes("too many") || m.includes("security purposes")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to")) {
    return "Couldn't reach OraMedha. Check your internet and try again.";
  }
  if (m.includes("signups not allowed") || m.includes("signup")) {
    return "New sign-ups are closed right now. Please contact the OraMedha team.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * What the sign-in callback tells the login screen when it could not sign the
 * PG in (`/login?error=…`). Short codes, so no provider text ever lands in
 * the address bar or browser history.
 */
export type SignInErrorCode = "cancelled" | "browser" | "closed" | "failed";

const SIGN_IN_ERROR_CODES: readonly SignInErrorCode[] = ["cancelled", "browser", "closed", "failed"];

export function isSignInErrorCode(value: unknown): value is SignInErrorCode {
  return typeof value === "string" && (SIGN_IN_ERROR_CODES as readonly string[]).includes(value);
}

/** The code for an error Google or Supabase sent back to /auth/callback. */
export function callbackErrorCode(error: string | null, description: string | null): SignInErrorCode {
  const d = (description ?? "").toLowerCase();
  if (d.includes("signups not allowed") || d.includes("signup")) return "closed";
  if (error === "access_denied") return "cancelled";
  return "failed";
}

/** The code for a failed code exchange in /auth/callback. */
export function exchangeErrorCode(message: string | undefined): SignInErrorCode {
  const m = (message ?? "").toLowerCase();
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("flow state")) return "browser";
  if (m.includes("signups not allowed") || m.includes("signup")) return "closed";
  return "failed";
}

export function signInErrorMessage(code: SignInErrorCode): string {
  switch (code) {
    case "cancelled":
      return "Sign-in was cancelled. Tap Continue with Google to try again.";
    case "browser":
      return "Sign-in has to finish in the same browser it started in. Tap Continue with Google again.";
    case "closed":
      return "New sign-ups are closed right now. Please contact the OraMedha team.";
    case "failed":
      return "Couldn't finish signing in. Please try again.";
  }
}
