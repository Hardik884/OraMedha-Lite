"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PERIOD_OPTIONS, type PeriodKind } from "@/lib/progress/count";

/**
 * Filters for Progress and the logbook, kept in the URL (so Back and a
 * refresh keep them): a choice list (specialty or case type), the period,
 * and a custom date range.
 */
export function PeriodFilter({
  choice,
  period,
  from,
  to,
  today,
}: {
  /** e.g. specialty on Progress, case type on the logbook. Hidden with one option. */
  choice?: { param: string; label: string; value: string; options: { value: string; label: string }[] };
  period: PeriodKind;
  from: string | null;
  to: string | null;
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [kind, setKind] = useState<PeriodKind>(period);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function go(update: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(update)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function pickPeriod(value: PeriodKind) {
    setKind(value);
    if (value !== "custom") go({ period: value, from: null, to: null });
  }

  const showChoice = !!choice && choice.options.length > 1;
  return (
    <div className="space-y-3">
      {/* Side by side, as in the mockup: [Specialty ▾] [This year ▾] */}
      <div className={showChoice ? "grid grid-cols-2 gap-2" : ""}>
        {showChoice && (
          <Select
            aria-label={choice!.label}
            value={choice!.value}
            onChange={(e) => go({ [choice!.param]: e.target.value || null })}
          >
            {choice!.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        <Select aria-label="Period" value={kind} onChange={(e) => pickPeriod(e.target.value as PeriodKind)}>
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value === "custom" ? "Custom range" : o.label}
            </option>
          ))}
        </Select>
      </div>
      {kind === "custom" && (
        <form
          className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ period: "custom", from: customFrom || null, to: customTo || null });
          }}
        >
          <Field label="From" htmlFor="period-from">
            <Input id="period-from" type="date" max={today} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="period-to">
            <Input id="period-to" type="date" max={today} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </Field>
          <Button type="submit" size="lg">
            Show
          </Button>
        </form>
      )}
    </div>
  );
}
