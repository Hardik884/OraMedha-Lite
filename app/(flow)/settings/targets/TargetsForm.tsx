"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveTargets } from "@/app/(flow)/progress/actions";

type Group = { specialty: string; caseTypes: { id: string; name: string; target: number | null }[] };

/** One number per case type; leave it empty for no target. */
export function TargetsForm({ groups, doneHref }: { groups: Group[]; doneHref: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(groups.flatMap((g) => g.caseTypes.map((t) => [t.id, t.target ? String(t.target) : ""]))),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    const targets = Object.entries(values).map(([caseTypeId, v]) => ({
      caseTypeId,
      target: v.trim() === "" ? null : Number(v),
    }));
    if (targets.some((t) => t.target !== null && (!Number.isInteger(t.target) || t.target < 1 || t.target > 1000))) {
      setError("A target is a whole number from 1 to 1000, or empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const r = await saveTargets({ targets });
        if (!r.ok) return setError(r.error);
        router.push(doneHref);
      } catch {
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  return (
    <form onSubmit={save} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <p className="text-sm text-text-secondary">
        Set how many cases of each type you aim to complete (e.g. what your department expects). Progress then shows
        &ldquo;8 / 10&rdquo;. Leave empty for no target.
      </p>
      {groups.map((g) => (
        <section key={g.specialty} className="space-y-2">
          <h2 className="text-sm font-semibold text-text-primary">{g.specialty}</h2>
          <Card className="divide-y divide-border">
            {g.caseTypes.map((t) => (
              <label key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-base text-text-primary">{t.name}</span>
                <Input
                  className="w-24 text-right tabular-nums"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="—"
                  aria-label={`Target for ${t.name}`}
                  value={values[t.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                />
              </label>
            ))}
          </Card>
        </section>
      ))}
      {error && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <BottomActions>
        <Button type="submit" size="xl" block isLoading={pending}>
          {pending ? "Saving…" : "Save targets"}
        </Button>
      </BottomActions>
    </form>
  );
}
