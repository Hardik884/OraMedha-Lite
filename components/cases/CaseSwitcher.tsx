import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { caseLabel, CASE_STATUS_LABELS } from "@/lib/cases/status";
import { newCasePath, patientPath, type BackTo } from "@/lib/navigation/paths";
import type { CaseSummary } from "@/lib/data/cases";

/**
 * One chip per case of this patient (e.g. two teeth), plus "New case". The
 * selected case is in the URL (?case=…), so it survives a refresh and the
 * back button.
 */
export function CaseSwitcher({
  cases,
  selectedId,
  patientId,
  from,
}: {
  cases: CaseSummary[];
  selectedId: string;
  patientId: string;
  from?: BackTo;
}) {
  return (
    <nav aria-label="This patient's cases" className="-mx-4 overflow-x-auto no-scrollbar">
      <ul className="flex w-max gap-2 px-4">
        {cases.map((c) => {
          const selected = c.caseId === selectedId;
          return (
            <li key={c.caseId}>
              <Link
                href={patientPath(patientId, { caseId: c.caseId, from })}
                replace
                scroll={false}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-11 flex-col justify-center rounded-[10px] border px-3.5 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected
                    ? "border-accent-soft-border bg-accent-soft text-accent-hover"
                    : "border-border bg-surface text-text-primary active:bg-surface-muted",
                )}
              >
                <span className="text-sm font-semibold leading-tight whitespace-nowrap">
                  {caseLabel(c.tooth, c.caseTypeName)}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight",
                    selected ? "text-accent-hover/80" : "text-text-secondary",
                  )}
                >
                  {CASE_STATUS_LABELS[c.status]}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={newCasePath(patientId)}
            className="flex h-11 items-center gap-1.5 rounded-[10px] border border-dashed border-border-strong px-3.5 text-sm font-medium text-text-body active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New case
          </Link>
        </li>
      </ul>
    </nav>
  );
}
