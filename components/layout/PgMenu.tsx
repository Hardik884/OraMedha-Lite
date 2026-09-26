"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatIndianMobile } from "@/lib/auth/phone";
import { LOGIN_PATH } from "@/lib/auth/routes";

type PgSummary = {
  fullName: string;
  college: string;
  specialtyName: string;
  phone: string | null;
};

/**
 * The PG's initials in the app bar. Opens a sheet with who is signed in, the
 * theme switch and Sign out. (Full Settings arrive in Slice 3.)
 */
export function PgMenu({ pg }: { pg: PgSummary }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = useBrowserSupabaseClient();
  const router = useRouter();

  // Supabase stores phones as E.164 without "+", e.g. "919876543210".
  const national = pg.phone?.replace(/^\+?91/, "") ?? null;

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace(LOGIN_PATH);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Your profile and sign out"
        className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PatientAvatar name={pg.fullName} size="sm" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Your profile" busy={signingOut}>
        <div className="space-y-5 p-4">
          <div className="flex items-center gap-3">
            <PatientAvatar name={pg.fullName} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">{pg.fullName}</p>
              <p className="truncate text-sm text-text-secondary">
                {pg.specialtyName} · {pg.college}
              </p>
              {national && (
                <p className="text-sm text-text-secondary tabular-nums">
                  +91 {formatIndianMobile(national)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Appearance</p>
            <ThemeToggle className="w-full" />
          </div>

          <Button
            variant="outline"
            size="xl"
            block
            onClick={signOut}
            isLoading={signingOut}
            className="text-danger"
          >
            {!signingOut && <LogOut className="h-5 w-5" aria-hidden />}
            Sign out
          </Button>
        </div>
      </Dialog>
    </>
  );
}
