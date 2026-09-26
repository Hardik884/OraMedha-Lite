import Link from "next/link";
import { Button } from "@/components/ui/button";
import { caseLabel } from "@/lib/cases/status";
import { patientPath, schedulePath } from "@/lib/navigation/paths";
import type { CaseSummary } from "@/lib/data/cases";

/** An ongoing case with no next appointment, with a one-tap Schedule. */
export function PendingCaseRow({ kase }: { kase: CaseSummary }) {
  const detail = [caseLabel(kase.tooth, kase.caseTypeName), kase.currentStageName].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-2 pr-3">
      <Link
        href={patientPath(kase.patientId, { caseId: kase.caseId, from: "today" })}
        className="min-w-0 flex-1 px-4 py-3.5 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="block truncate text-base font-semibold text-text-primary">{kase.patientName}</span>
        <span className="block truncate text-sm text-text-secondary">{detail}</span>
        <span className="block text-sm text-warning">Needs next appointment</span>
      </Link>
      <Button asChild variant="outline" size="lg" className="shrink-0">
        <Link href={schedulePath(kase.patientId, kase.caseId)}>Schedule</Link>
      </Button>
    </li>
  );
}
