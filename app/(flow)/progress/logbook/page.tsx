import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileSpreadsheet, FileText, Star } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFilter } from "@/components/progress/PeriodFilter";
import { requirePg } from "@/lib/pg/require";
import { getLogEntries, getProgressCases, getSpecialtiesAndCaseTypes } from "@/lib/data/progress";
import { logbookEntries } from "@/lib/progress/count";
import { logbookQueryString, parseLogbookQuery, type LogbookQuery } from "@/lib/progress/query";
import { formatShortDate, istToday } from "@/lib/dates";
import { caseLabel } from "@/lib/cases/status";
import { patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Logbook" };
export const dynamic = "force-dynamic";

/** On screen; the exports always carry every row. */
const SHOWN = 300;

function exportHref(format: "xlsx" | "pdf", query: Record<string, string | null>) {
  const params = new URLSearchParams({ format });
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  return `/api/logbook/export?${params.toString()}`;
}

/**
 * The logbook: one row per stage done in a visit, filled in from updated
 * visits. Filter by case type and date range; export to Excel or PDF.
 */
export default async function LogbookPage({ searchParams }: { searchParams: Promise<LogbookQuery> }) {
  const pg = await requirePg();
  const today = istToday();
  const [{ specialties, caseTypes }, cases] = await Promise.all([getSpecialtiesAndCaseTypes(), getProgressCases()]);

  // Case types of the PG's specialty, and of any other specialty they have cases in.
  const specialtyIds = new Set([pg.specialty.id, ...cases.map((c) => c.specialtyId)]);
  // The PG's own specialty first, then the others, each in template order.
  const mine = caseTypes
    .filter((t) => specialtyIds.has(t.specialtyId))
    .sort((a, b) => Number(b.specialtyId === pg.specialty.id) - Number(a.specialtyId === pg.specialty.id) || a.sortOrder - b.sortOrder);
  const several = specialtyIds.size > 1;
  const specialtyName = (id: string) => specialties.find((s) => s.id === id)?.name ?? "";
  const filter = parseLogbookQuery(await searchParams, today, mine.map((t) => t.id));

  const entries = logbookEntries(
    await getLogEntries({ period: filter.period, caseTypeId: filter.caseTypeId, specialtyId: null }),
    filter.period,
    filter.caseTypeId,
  ).filter((e) => mine.some((t) => t.id === e.caseTypeId));
  const query = logbookQueryString(filter);

  return (
    <>
      <FlowHeader backHref="/progress" backLabel="Back to Progress" title="Logbook" subtitle={`${entries.length} entries · ${filter.period.label}`} />
      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-16">
        <PeriodFilter
          choice={{
            param: "caseType",
            label: "Case type",
            value: filter.caseTypeId ?? "",
            options: [
              { value: "", label: "All case types" },
              ...mine.map((t) => ({ value: t.id, label: several ? `${specialtyName(t.specialtyId)} · ${t.name}` : t.name })),
            ],
          }}
          period={filter.period.kind}
          from={filter.period.from}
          to={filter.period.to}
          today={today}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="lg">
            <a href={exportHref("xlsx", query)} download>
              <FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden />
              Excel
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={exportHref("pdf", query)} download>
              <FileText className="h-4 w-4 text-accent" aria-hidden />
              PDF
            </a>
          </Button>
        </div>
        <p className="text-xs text-text-secondary">
          Exports hold what&apos;s shown here, with your name and college. Patient phone numbers are never included.
        </p>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen />}
              title="No entries for this filter"
              description="Each stage you record in Update Visit appears here by itself."
            />
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {entries.slice(0, SHOWN).map((e) => (
              <Link
                key={`${e.visitId}-${e.stageId}`}
                href={patientPath(e.patientId, { caseId: e.caseId })}
                className="flex gap-3 px-4 py-3 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span className="w-14 shrink-0 pt-0.5 text-sm tabular-nums text-text-secondary">{formatShortDate(e.visitDate, today)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-base font-medium text-text-primary">{e.patientName}</span>
                    {e.isSpecial && <Star className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Special case" />}
                  </span>
                  <span className="block truncate text-sm text-text-secondary">
                    {[e.opdNumber ? `OPD ${e.opdNumber}` : null, caseLabel(e.tooth, e.caseTypeName)].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-sm text-text-body">{e.stageName}</span>
                    <Badge variant={e.outcome === "complete" ? "success" : "secondary"}>
                      {e.outcome === "complete" ? "Complete" : "Partial"}
                    </Badge>
                  </span>
                </span>
              </Link>
            ))}
          </Card>
        )}
        {entries.length > SHOWN && (
          <p className="text-center text-sm text-text-secondary">
            Showing the latest {SHOWN}. Narrow the dates, or export to see all {entries.length}.
          </p>
        )}
      </main>
    </>
  );
}
