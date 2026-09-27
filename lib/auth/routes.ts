/**
 * Which paths need a signed-in PG, and where to send people.
 *
 * Pure so the middleware's decisions are unit-tested rather than discovered
 * on a phone.
 */
export const LOGIN_PATH = "/login";
export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/today";
export const WELCOME_PATH = "/welcome";
/** Where Google (via Supabase Auth) sends the PG back with a one-time code. */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Reachable without signing in. None of these show patient data. */
const PUBLIC_PATHS = [LOGIN_PATH, "/auth", "/offline", "/dev/ui"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only same-site relative paths may be used as the post-login destination —
 * never `//evil.example` or an absolute URL smuggled in through `?next=`.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return HOME_PATH;
  }
  if (next === LOGIN_PATH || next.startsWith(`${LOGIN_PATH}?`)) return HOME_PATH;
  if (next.startsWith("/auth/") || next === "/auth") return HOME_PATH;
  return next;
}

/** Adds `?next=` only when it says something (not for Today). */
function withNext(path: string, next: string): string {
  const safe = safeNextPath(next);
  return safe === HOME_PATH ? path : `${path}?next=${encodeURIComponent(safe)}`;
}

/** The address Google should return to, remembering where the PG was going. */
export function authCallbackUrl(origin: string, next: string | null | undefined): string {
  return `${origin}${withNext(AUTH_CALLBACK_PATH, next ?? "")}`;
}

/** Where a PG goes right after signing in: onboarding first if they have no profile. */
export function destinationAfterSignIn(hasProfile: boolean, next: string | null | undefined): string {
  return hasProfile ? safeNextPath(next) : withNext(ONBOARDING_PATH, next ?? "");
}

/** The login screen, optionally with a short error code and the page to return to. */
export function loginPath(options: { error?: string; next?: string | null } = {}): string {
  const params = new URLSearchParams();
  if (options.error) params.set("error", options.error);
  const safe = safeNextPath(options.next);
  if (safe !== HOME_PATH) params.set("next", safe);
  const query = params.toString();
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
}

export type AuthRedirect = { to: string } | null;

/**
 * The middleware's routing rule:
 *  - a sign-in code that landed on / or /login (Supabase falls back to the
 *    Site URL when the callback address isn't allowed) → the callback
 *  - signed out on a private page → login, remembering where they were going
 *  - signed in on the login page  → where they were going, or home
 *  - otherwise                     → carry on
 * (Onboarding is enforced by the app layout, which already loads the profile.)
 */
export function authRedirectFor(pathname: string, search: string, signedIn: boolean): AuthRedirect {
  const params = new URLSearchParams(search);
  if ((pathname === "/" || pathname === LOGIN_PATH) && params.has("code")) {
    return { to: `${AUTH_CALLBACK_PATH}${search}` };
  }
  if (!signedIn && !isPublicPath(pathname)) {
    const next = `${pathname}${search}`;
    return { to: next === "/" ? LOGIN_PATH : loginPath({ next }) };
  }
  if (signedIn && pathname === LOGIN_PATH) return { to: safeNextPath(params.get("next")) };
  return null;
}
