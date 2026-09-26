"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserSupabaseClient } from "@/lib/supabase/client";
import { LOGIN_PATH } from "@/lib/auth/routes";

export function SignOutButton() {
  const supabase = useBrowserSupabaseClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace(LOGIN_PATH);
    router.refresh();
  }

  return (
    <Button variant="outline" size="xl" block onClick={signOut} isLoading={busy} className="text-danger">
      {!busy && <LogOut className="h-5 w-5" aria-hidden />}
      Sign out
    </Button>
  );
}
