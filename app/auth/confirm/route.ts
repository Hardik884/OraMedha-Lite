import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/lib/auth/after-sign-in";
import { isEmailLinkType } from "@/lib/auth/email";
import { loginPath, SET_PASSWORD_PATH } from "@/lib/auth/routes";

/**
 * Links in our emails land here: "Confirm your email" and "Reset your
 * password" (see README → email templates). The link carries a one-time
 * token hash, so it works in any browser — including the one a mail app
 * opens — unlike a code that needs the browser the request started in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (!tokenHash || !isEmailLinkType(type)) return go(loginPath({ error: "link" }));

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) {
    console.error("Email link: verify failed", error?.code ?? error?.status ?? "no user");
    return go(loginPath({ error: "link" }));
  }

  // A reset link signs the PG in; next they choose a new password.
  if (type === "recovery") return go(SET_PASSWORD_PATH);
  return go(await destinationFor(supabase, data.user.id, next));
}
