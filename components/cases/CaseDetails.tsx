import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CASE_STATUS_LABELS, CASE_STATUS_VARIANTS } from "@/lib/cases/status";
import type { CaseSummary } from "@/lib/data/cases";
import { SpecialCaseToggle } from "@/components/progress/SpecialCaseToggle";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-semibold text-text-primary">{children}</dd>
    </div>
  );
}

/** Tooth, case type, current stage and status — the case at a glance — and the special-case flag. */
export function CaseDetails({ kase }: { kase: CaseSummary }) {
  return (
    <Card className="p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Item label="Tooth">{kase.tooth ?? "—"}</Item>
        <Item label="Case">{kase.caseTypeName}</Item>
        <Item label="Current stage">{kase.currentStageName ?? "—"}</Item>
        <div>
          <dt className="text-xs text-text-secondary">Status</dt>
          <dd className="mt-1">
            <Badge variant={CASE_STATUS_VARIANTS[kase.status]}>{CASE_STATUS_LABELS[kase.status]}</Badge>
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <SpecialCaseToggle key={kase.caseId} caseId={kase.caseId} initial={kase.isSpecial} />
      </div>
    </Card>
  );
}
