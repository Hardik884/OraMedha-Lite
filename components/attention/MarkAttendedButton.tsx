"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setAppointmentStatus } from "@/app/(flow)/patients/appointment-actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

/** "Yes, they came" for a visit that can't be recorded any more: marks the appointment completed. */
export function MarkAttendedButton({ appointmentId, doneHref }: { appointmentId: string; doneHref: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="xl"
        block
        isLoading={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const r = await setAppointmentStatus({ appointmentId, to: "completed" });
              if (!r.ok) return setError(r.error);
              router.push(doneHref);
            } catch (error) {
              if (isNavigationSignal(error)) return;
              setError("Couldn't reach OraMedha. Check your internet and try again.");
            }
          })
        }
      >
        Mark as came
      </Button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
