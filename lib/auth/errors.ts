/**
 * Supabase Auth error text is written for developers. PGs get a short,
 * actionable sentence instead. Never includes the phone number.
 */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();

  if (m.includes("phone") && (m.includes("disabled") || m.includes("unsupported") || m.includes("provider"))) {
    return "Phone sign-in isn't switched on yet. Please contact the OraMedha team.";
  }
  if (m.includes("rate") || m.includes("too many") || m.includes("security purposes")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) {
    return "That code is wrong or has expired. Check it, or send a new one.";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to")) {
    return "Couldn't reach OraMedha. Check your internet and try again.";
  }
  if (m.includes("signups not allowed") || m.includes("signup")) {
    return "New sign-ups are closed right now. Please contact the OraMedha team.";
  }
  return "Something went wrong. Please try again.";
}
