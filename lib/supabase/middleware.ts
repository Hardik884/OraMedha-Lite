import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { authRedirectFor } from "@/lib/auth/routes";
import { getSupabaseEnv } from "./env";

/**
 * updateSession — runs on every page request (see middleware.ts).
 *
 * 1. Refreshes the Supabase session cookie, so a PG who opens the app after a
 *    night away is still signed in (access tokens last an hour; the refresh
 *    token keeps the session going).
 * 2. Sends signed-out visitors to /login, and signed-in PGs away from it.
 *
 * This is a convenience layer. Row Level Security in the database is what
 * actually protects patient data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: nothing between createServerClient and getUser — this call is
  // what refreshes an expired session and writes the new cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const redirect = authRedirectFor(pathname, search, Boolean(user));
  if (!redirect) return response;

  const target = request.nextUrl.clone();
  const [path, query] = redirect.to.split("?");
  target.pathname = path!;
  target.search = query ? `?${query}` : "";

  const redirectResponse = NextResponse.redirect(target);
  // Carry over any refreshed session cookies so the redirect doesn't drop them.
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}
