"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { authCallbackUrl } from "@/lib/auth/routes";

/**
 * "Continue with Google": Supabase Auth's Google sign-in with PKCE. The
 * browser leaves for Google and comes back to /auth/callback, which finishes
 * the sign-in on the server.
 */
export function GoogleSignIn({ next, initialError }: { next: string; initialError: string | null }) {
  const supabase = useBrowserSupabaseClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Coming back with the browser's Back button restores this page from
  // memory, still spinning. Let the PG tap again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    const { error: startError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(window.location.origin, next),
        // Always show the account chooser, so a shared phone never signs in
        // as whoever used Google on it last.
        queryParams: { prompt: "select_account" },
      },
    });
    if (startError) {
      setBusy(false);
      setError(friendlyAuthError(startError.message));
    }
    // Otherwise the browser is on its way to Google; stay busy.
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Button variant="outline" size="xl" block onClick={start} isLoading={busy}>
          {!busy && (
            // eslint-disable-next-line @next/next/no-img-element -- a fixed 20px brand mark
            <img src="/brand/google-g.svg" alt="" width={20} height={20} className="h-5 w-5" />
          )}
          {busy ? "Opening Google…" : "Continue with Google"}
        </Button>
        <p className="text-center text-xs text-text-secondary">
          OraMedha Lite only gets your name and email from Google.
        </p>
      </div>
    </div>
  );
}
