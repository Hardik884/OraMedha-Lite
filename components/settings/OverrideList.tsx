"use client";

import { useState, useTransition } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  describeGap,
  effectiveValues,
  type OverrideInput,
  type OverrideValues,
  type TemplateValues,
} from "@/lib/settings/overrides";
import { formatDuration } from "@/lib/scheduling/defaults";
import type { SettingsResult } from "@/app/(flow)/settings/actions";

/**
 * One editable item: a template stage or a modifier rule. The list
 * shows the value in force and, where the PG changed it, the template value
 * beside it — so "mine" vs "template" is always visible — plus a one-tap
 * Reset. Tapping the row opens the editor.
 */
export type OverrideItem = {
  id: string;
  title: string;
  /** Small line under the title (e.g. "Only at <stage> · next step: <stage>"). */
  note?: string;
  template: TemplateValues;
  override: OverrideValues | null;
  gapEditable: boolean;
  /** Stages may have their own gap after a Partial visit; modifiers don't. */
  partialEditable?: boolean;
  /** Label when the template has no duration of its own (modifiers). */
  durationFallback?: string;
};

type Handlers = {
  onSave: (id: string, values: OverrideInput) => Promise<SettingsResult<keyof OverrideInput>>;
  onReset: (id: string) => Promise<SettingsResult>;
};

function ValueLine({
  label,
  value,
  custom,
  templateValue,
}: {
  label: string;
  value: string;
  custom: boolean;
  templateValue: string;
}) {
  return (
    <span className="block text-sm">
      <span className="text-text-secondary">{label} </span>
      <span className={cn("font-medium", custom ? "text-accent-hover" : "text-text-body")}>{value}</span>
      {custom && <span className="text-text-secondary"> · template {templateValue}</span>}
    </span>
  );
}

export function OverrideList({ items, ...handlers }: { items: OverrideItem[] } & Handlers) {
  const [editing, setEditing] = useState<OverrideItem | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function reset(id: string) {
    setResetting(id);
    startTransition(async () => {
      try {
        await handlers.onReset(id);
      } finally {
        setResetting(null);
      }
    });
  }

  return (
    <>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const eff = effectiveValues(item.template, item.override);
            const custom = eff.customDuration || eff.customGap || eff.customPartialGap;
            const hasPartial = eff.partialGapMinDays !== null;
            return (
              <li key={item.id} className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="min-w-0 flex-1 cursor-pointer px-4 py-3 text-left active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-text-primary">{item.title}</span>
                    {custom ? <Badge variant="accent">Yours</Badge> : <Badge variant="outline">Template</Badge>}
                  </span>
                  {item.note && <span className="block text-xs text-text-secondary">{item.note}</span>}
                  <ValueLine
                    label="Duration"
                    value={eff.durationMin !== null ? formatDuration(eff.durationMin) : (item.durationFallback ?? "—")}
                    custom={eff.customDuration}
                    templateValue={
                      item.template.durationMin !== null
                        ? formatDuration(item.template.durationMin)
                        : (item.durationFallback ?? "—")
                    }
                  />
                  {item.gapEditable ? (
                    <ValueLine
                      label="Next visit in"
                      value={describeGap(eff.gapMinDays, eff.gapMaxDays)}
                      custom={eff.customGap}
                      templateValue={describeGap(item.template.gapMinDays, item.template.gapMaxDays)}
                    />
                  ) : (
                    <span className="block text-sm text-text-secondary">Last stage — no next stage</span>
                  )}
                  {item.partialEditable && hasPartial && (
                    <ValueLine
                      label="After a partial visit"
                      value={describeGap(eff.partialGapMinDays, eff.partialGapMaxDays)}
                      custom={eff.customPartialGap}
                      templateValue={
                        item.template.partialGapMinDays != null
                          ? describeGap(item.template.partialGapMinDays, item.template.partialGapMaxDays)
                          : "same as usual"
                      }
                    />
                  )}
                </button>
                {custom ? (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => reset(item.id)}
                    isLoading={resetting === item.id}
                    aria-label={`Reset ${item.title} to template`}
                    className="shrink-0 px-3 text-text-body"
                  >
                    {resetting !== item.id && <RotateCcw className="h-4 w-4" aria-hidden />}
                    Reset
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => setEditing(item)}
                    aria-label={`Change ${item.title}`}
                    className="shrink-0 text-text-secondary"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {editing && (
        <OverrideEditor key={editing.id} item={editing} onClose={() => setEditing(null)} {...handlers} />
      )}
    </>
  );
}

function OverrideEditor({ item, onClose, onSave, onReset }: { item: OverrideItem; onClose: () => void } & Handlers) {
  const eff = effectiveValues(item.template, item.override);
  const [values, setValues] = useState<OverrideInput>({
    durationMin: eff.durationMin?.toString() ?? "",
    gapMinDays: eff.gapMinDays?.toString() ?? "",
    gapMaxDays: eff.gapMaxDays?.toString() ?? "",
    partialGapMinDays: eff.partialGapMinDays?.toString() ?? "",
    partialGapMaxDays: eff.partialGapMaxDays?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OverrideInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof OverrideInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function run(action: () => Promise<SettingsResult<keyof OverrideInput>>) {
    setFormError(null);
    startTransition(async () => {
      let result: SettingsResult<keyof OverrideInput> | undefined;
      try {
        result = await action();
      } catch {
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.ok) onClose();
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    });
  }

  const t = item.template;
  const templateDuration = t.durationMin !== null ? formatDuration(t.durationMin) : (item.durationFallback ?? "—");

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.title}
      description={item.note}
      busy={pending}
      footer={
        <div className="space-y-2">
          <Button size="xl" block onClick={() => run(() => onSave(item.id, values))} isLoading={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {item.override && (
            <Button variant="ghost" size="lg" block onClick={() => run(() => onReset(item.id))} disabled={pending}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset to template
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 p-4">
        <Field
          label="Duration (minutes)"
          htmlFor="ov-duration"
          error={errors.durationMin}
          hint={`Template: ${templateDuration}. Leave empty to follow the template.`}
        >
          <Input
            id="ov-duration"
            inputMode="numeric"
            placeholder={t.durationMin?.toString() ?? ""}
            value={values.durationMin}
            onChange={(e) => set("durationMin", e.target.value)}
            hasError={Boolean(errors.durationMin)}
          />
        </Field>

        {item.gapEditable && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">Next visit in (days)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Earliest" htmlFor="ov-gap-min" error={errors.gapMinDays}>
                <Input
                  id="ov-gap-min"
                  inputMode="numeric"
                  placeholder={t.gapMinDays?.toString() ?? ""}
                  value={values.gapMinDays}
                  onChange={(e) => set("gapMinDays", e.target.value)}
                  hasError={Boolean(errors.gapMinDays)}
                />
              </Field>
              <Field label="Latest" htmlFor="ov-gap-max" error={errors.gapMaxDays}>
                <Input
                  id="ov-gap-max"
                  inputMode="numeric"
                  placeholder={t.gapMaxDays?.toString() ?? ""}
                  value={values.gapMaxDays}
                  onChange={(e) => set("gapMaxDays", e.target.value)}
                  hasError={Boolean(errors.gapMaxDays)}
                />
              </Field>
            </div>
            <p className="text-xs text-text-secondary">
              Template: {describeGap(t.gapMinDays, t.gapMaxDays)}. Leave both empty to follow the template.
            </p>
          </div>
        )}

        {item.partialEditable && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">After a partial visit (days, optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Earliest" htmlFor="ov-pgap-min" error={errors.partialGapMinDays}>
                <Input
                  id="ov-pgap-min"
                  inputMode="numeric"
                  placeholder={t.partialGapMinDays?.toString() ?? ""}
                  value={values.partialGapMinDays}
                  onChange={(e) => set("partialGapMinDays", e.target.value)}
                  hasError={Boolean(errors.partialGapMinDays)}
                />
              </Field>
              <Field label="Latest" htmlFor="ov-pgap-max" error={errors.partialGapMaxDays}>
                <Input
                  id="ov-pgap-max"
                  inputMode="numeric"
                  placeholder={t.partialGapMaxDays?.toString() ?? ""}
                  value={values.partialGapMaxDays}
                  onChange={(e) => set("partialGapMaxDays", e.target.value)}
                  hasError={Boolean(errors.partialGapMaxDays)}
                />
              </Field>
            </div>
            <p className="text-xs text-text-secondary">
              When this stage isn&apos;t finished in one visit. Leave both empty to use{" "}
              {t.partialGapMinDays != null ? `the template (${describeGap(t.partialGapMinDays, t.partialGapMaxDays)})` : "the usual gap"}.
            </p>
          </div>
        )}

        {formError && (
          <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}
      </div>
    </Dialog>
  );
}
