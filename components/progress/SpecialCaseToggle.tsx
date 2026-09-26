"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setCaseSpecial } from "@/app/(flow)/progress/actions";

/** "Special case" on the Patient / Case screen — counted separately on Progress. */
export function SpecialCaseToggle({ caseId, initial }: { caseId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    setError(null);
    startTransition(async () => {
      try {
        const r = await setCaseSpecial({ caseId, special: next });
        if (!r.ok) {
          setOn(!next);
          setError(r.error);
        } else router.refresh();
      } catch {
        setOn(!next);
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span id={`special-${caseId}`} className="flex items-center gap-2 text-base font-medium text-text-primary">
          <Star className={on ? "h-4 w-4 text-accent" : "h-4 w-4 text-text-secondary"} aria-hidden />
          Special case
        </span>
        <Switch checked={on} onChange={change} disabled={pending} aria-labelledby={`special-${caseId}`} />
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
