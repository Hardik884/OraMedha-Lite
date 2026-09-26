"use client";

import { OverrideList } from "@/components/settings/OverrideList";
import type { CaseTypeDefaults } from "@/lib/data/settings";
import { resetStageOverride, saveStageOverride } from "../actions";

export function StageDefaults({ caseTypes }: { caseTypes: CaseTypeDefaults[] }) {
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 pt-5 pb-12">
      <p className="text-sm text-text-secondary">
        How long each stage usually takes you, and when the next visit usually is. OraMedha suggests these — you can
        always change them per patient. Tap a stage to set your own.
      </p>

      {caseTypes.map((ct) => (
        <section key={ct.caseTypeId} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">{ct.name}</h2>
          <OverrideList
            items={ct.stages.map((s) => ({
              id: s.stageId,
              title: s.name,
              template: s.template,
              override: s.override,
              gapEditable: s.gapEditable,
              partialEditable: true,
            }))}
            onSave={(stageId, values) => saveStageOverride({ stageId, values })}
            onReset={resetStageOverride}
          />
        </section>
      ))}
    </main>
  );
}
