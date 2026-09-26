/**
 * Which paths need a signed-in PG, and where to send people.
 *
 * Pure so the middleware's decisions are unit-tested rather than discovered
 * on a phone.
 */
export const LOGIN_PATH = "/login";
export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/today";

/** Reachable without signing in. None of these show patient data. */
const PUBLIC_PATHS = [LOGIN_PATH, "/offline", "/dev/ui"];

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
  return next;
}

export type AuthRedirect = { to: string } | null;

/**
 * The middleware's routing rule:
 *  - signed out on a private page → login, remembering where they were going
 *  - signed in on the login page  → home
 *  - otherwise                     → carry on
 * (Onboarding is enforced by the app layout, which already loads the profile.)
 */
export function authRedirectFor(pathname: string, search: string, signedIn: boolean): AuthRedirect {
  if (!signedIn && !isPublicPath(pathname)) {
    const next = `${pathname}${search}`;
    return {
      to: next === "/" || next === HOME_PATH
        ? LOGIN_PATH
        : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`,
    };
  }
  if (signedIn && pathname === LOGIN_PATH) return { to: HOME_PATH };
  return null;
}
