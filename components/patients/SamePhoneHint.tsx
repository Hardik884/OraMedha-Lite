"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseIndianMobile } from "@/lib/auth/phone";
import { samePhoneHint, type SamePhonePatient } from "@/lib/patients/duplicates";
import { patientPath } from "@/lib/navigation/paths";
import { findPatientsWithPhone } from "@/app/(flow)/patients/actions";

/**
 * Under the phone field on New Patient: if one of the PG's patients already
 * has this number, ask gently whether it's the same person. Never blocks —
 * families often share a phone.
 */
export function SamePhoneHint({ phone }: { phone: string }) {
  const parsed = parseIndianMobile(phone);
  const number = parsed.ok ? parsed.national : null;
  const [found, setFound] = useState<{ number: string; matches: SamePhonePatient[] } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!number) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findPatientsWithPhone({ phone: number })
        .then((matches) => !cancelled && setFound({ number, matches }))
        .catch(() => {}); // only a hint: stay quiet if offline
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [number]);

  const matches = found && found.number === number ? found.matches : [];
  const hint = samePhoneHint(matches);
  if (!hint || dismissed === number) return null;

  return (
    <div className="rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3" role="status">
      <p className="flex gap-2 text-sm text-info">
        <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {hint.text}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button asChild size="lg" variant="outline">
          <Link href={patientPath(matches[0]!.id, { from: "patients" })}>{hint.openLabel}</Link>
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setDismissed(number)}>
          No, new patient
        </Button>
      </div>
    </div>
  );
}
