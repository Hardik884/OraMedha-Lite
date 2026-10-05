"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { saveTargets } from "@/app/(flow)/progress/actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

type Group = {
  specialtyId: string;
  specialty: string;
  specialTarget: number | null;
  caseTypes: { id: string; name: string; target: number | null }[];
};

/** Keys of the special-case rows in the form's values, beside the case-type ids. */
const specialKey = (specialtyId: string) => `special:${specialtyId}`;

/** One number per case type; leave it empty for no target. */
export function TargetsForm({ groups, doneHref }: { groups: Group[]; doneHref: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      groups.flatMap((g) => [
        ...g.caseTypes.map((t) => [t.id, t.target ? String(t.target) : ""]),
        [specialKey(g.specialtyId), g.specialTarget ? String(g.specialTarget) : ""],
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    const asTarget = (v: string | undefined) => (!v || v.trim() === "" ? null : Number(v));
    const targets = groups.flatMap((g) => g.caseTypes.map((t) => ({ caseTypeId: t.id, target: asTarget(values[t.id]) })));
    const special = groups.map((g) => ({ specialtyId: g.specialtyId, target: asTarget(values[specialKey(g.specialtyId)]) }));
    const all = [...targets, ...special];
    if (all.some((t) => t.target !== null && (!Number.isInteger(t.target) || t.target < 1 || t.target > 1000))) {
      setError("A target is a whole number from 1 to 1000, or empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const r = await saveTargets({ targets, special });
        if (!r.ok) return setError(r.error);
        router.push(doneHref);
      } catch (error) {
        if (isNavigationSignal(error)) return;
        setError("Couldn't reach OraMedha. Check your internet and try again.");
      }
    });
  }

  return (
    <form onSubmit={save} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <p className="text-sm text-text-secondary">
        Set how many cases of each type you aim to complete (e.g. what your department expects). Progress then shows
        &ldquo;8 / 10&rdquo;. Special cases count the cases you mark as special. Leave empty for no target.
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
            <label className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-base text-text-primary">
                <Star className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span className="truncate">Special cases</span>
              </span>
              <Input
                className="w-24 text-right tabular-nums"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="—"
                aria-label={`Target for special cases in ${g.specialty}`}
                value={values[specialKey(g.specialtyId)] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [specialKey(g.specialtyId)]: e.target.value.replace(/[^0-9]/g, "") }))
                }
              />
            </label>
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
