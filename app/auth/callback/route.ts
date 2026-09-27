import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/lib/auth/after-sign-in";
import { callbackErrorCode, exchangeErrorCode } from "@/lib/auth/errors";
import { loginPath } from "@/lib/auth/routes";

/**
 * Google → Supabase Auth → here, with a one-time `code` (PKCE). Swaps it for
 * a session (cookies), then continues to onboarding, the page the PG was
 * trying to open, or Today. On any failure: back to the login screen with a
 * short error code — never the provider's own text.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");
  const code = searchParams.get("code");

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (!code) {
    const error = callbackErrorCode(searchParams.get("error"), searchParams.get("error_description"));
    return go(loginPath({ error, next }));
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // The error code only — no email or token details in the logs.
    console.error("Sign-in callback: code exchange failed", error?.code ?? error?.status ?? "no user");
    return go(loginPath({ error: exchangeErrorCode(error?.message), next }));
  }

  return go(await destinationFor(supabase, data.user.id, next));
}
