"use client";

import { OverrideList } from "@/components/settings/OverrideList";
import type { ModifierDefault } from "@/lib/data/settings";
import { resetModifierOverride, saveModifierOverride } from "../actions";

/** Groups modifier rules by case type; each is editable like a stage. */
export function ModifierRules({ modifiers }: { modifiers: ModifierDefault[] }) {
  const groups = modifiers.reduce<Map<string, ModifierDefault[]>>((map, m) => {
    map.set(m.caseTypeName, [...(map.get(m.caseTypeName) ?? []), m]);
    return map;
  }, new Map());

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 pt-5 pb-12">
      <p className="text-sm text-text-secondary">
        Things you note at a visit that change when the next visit should be. Tap a rule to set your own timing.
      </p>

      {[...groups.entries()].map(([caseTypeName, items]) => (
        <section key={caseTypeName} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">{caseTypeName}</h2>
          <OverrideList
            items={items.map((m) => ({
              id: m.modifierId,
              title: m.title,
              note: [
                m.stageName ? `Only at ${m.stageName}` : null,
                m.nextStageName ? `Next step becomes ${m.nextStageName}` : "Next step stays the same",
              ]
                .filter(Boolean)
                .join(" · "),
              template: m.template,
              override: m.override,
              gapEditable: true,
              durationFallback: "stage's usual",
            }))}
            onSave={(modifierId, values) => saveModifierOverride({ modifierId, values })}
            onReset={resetModifierOverride}
          />
        </section>
      ))}
    </main>
  );
}
