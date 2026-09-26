import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChartColumnIncreasing, ChevronDown, ChevronRight, Star, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFilter } from "@/components/progress/PeriodFilter";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { requirePg } from "@/lib/pg/require";
import { getLogEntries, getProgressCases, getSpecialtiesAndCaseTypes, getTargets } from "@/lib/data/progress";
import {
  caseTypeProgress,
  isPeriodKind,
  recentActivity,
  resolvePeriod,
  specialCounts,
  stageCounts,
  targetProgress,
} from "@/lib/progress/count";
import { formatShortDate, istToday } from "@/lib/dates";
import { logbookPath, patientPath } from "@/lib/navigation/paths";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

const RECENT = 5;

/**
 * Progress (mockup screen 9): completed cases per case type for a specialty
 * and period, ongoing cases, special cases, targets, and the latest visits.
 * All counted from cases and visits — nothing typed in.
 */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string; period?: string; from?: string; to?: string }>;
}) {
  const pg = await requirePg();
  const sp = await searchParams;
  const today = istToday();
  const period = resolvePeriod(
    { kind: isPeriodKind(sp.period) ? sp.period : "year", from: sp.from, to: sp.to },
    today,
  );

  const [{ specialties, caseTypes }, cases, targets] = await Promise.all([
    getSpecialtiesAndCaseTypes(),
    getProgressCases(),
    getTargets(),
  ]);

  // The PG's own specialty first, then any other they have cases in.
  const withCases = new Set(cases.map((c) => c.specialtyId));
  const specialtyOptions = specialties.filter((s) => s.id === pg.specialty.id || withCases.has(s.id));
  const specialty = specialtyOptions.find((s) => s.id === sp.specialty) ?? pg.specialty;

  const types = caseTypes.filter((t) => t.specialtyId === specialty.id);
  const inSpecialty = cases.filter((c) => c.specialtyId === specialty.id);
  const [entries, latest] = await Promise.all([
    getLogEntries({ period, specialtyId: specialty.id }),
    getLogEntries({ period: { from: null, to: null }, specialtyId: specialty.id, limit: 40 }),
  ]);

  const rows = caseTypeProgress(types, inSpecialty, period, targets);
  const maxCompleted = Math.max(0, ...rows.map((r) => r.completed));
  const stages = stageCounts(entries, period);
  const special = specialCounts(inSpecialty, period);
  const activity = recentActivity(latest, RECENT);
  const nothingYet = inSpecialty.length === 0;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="My clinical progress" subtitle={`${specialty.name} · ${period.label}`} />

      <PeriodFilter
        choice={{
          param: "specialty",
          label: "Specialty",
          value: specialty.id,
          options: specialtyOptions.map((s) => ({ value: s.id, label: s.name })),
        }}
        period={period.kind}
        from={period.from}
        to={period.to}
        today={today}
      />

      {nothingYet ? (
        <Card>
          <EmptyState
            icon={<ChartColumnIncreasing />}
            title="Nothing to count yet"
            description="Completed cases and your logbook fill in by themselves from the visits you update. Nothing to type in."
          />
        </Card>
      ) : (
        <>
          <section className="space-y-2" aria-labelledby="by-case-type">
            <div className="flex items-center justify-between">
              <h2 id="by-case-type" className="text-sm font-semibold text-text-primary">
                Completed cases
              </h2>
              <Link href="/settings/targets?from=progress" className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-accent">
                <Target className="h-4 w-4" aria-hidden />
                Targets
              </Link>
            </div>
            <Card className="divide-y divide-border">
              {rows.map((r) => {
                const bar = targetProgress(r.completed, r.target, maxCompleted);
                const mine = stages.filter((s) => s.caseTypeId === r.caseTypeId);
                return (
                  <details key={r.caseTypeId} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-base font-medium text-text-primary">{r.name}</span>
                          <span className="shrink-0 text-sm tabular-nums text-text-body">{bar.text}</span>
                        </span>
                        <ProgressBar fraction={bar.fraction} reached={bar.reached} className="mt-2" />
                        <span className="mt-1.5 block text-xs text-text-secondary">
                          {r.ongoing === 1 ? "1 ongoing" : `${r.ongoing} ongoing`}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="px-4 pb-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">Stages completed · {period.label}</p>
                      {mine.length === 0 ? (
                        <p className="text-sm text-text-secondary">No stages completed in this period.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {mine.map((s) => (
                            <li key={s.stageId} className="flex justify-between text-sm">
                              <span className="text-text-body">{s.name}</span>
                              <span className="tabular-nums font-medium text-text-primary">{s.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                );
              })}
            </Card>
          </section>

          <section className="space-y-2" aria-labelledby="special">
            <h2 id="special" className="text-sm font-semibold text-text-primary">
              Special cases
            </h2>
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Star className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-base text-text-body">
                <span className="font-semibold text-text-primary">{special.completed}</span> completed ·{" "}
                <span className="font-semibold text-text-primary">{special.ongoing}</span> ongoing
              </p>
            </Card>
            <p className="text-xs text-text-secondary">Mark a case as special on its patient screen.</p>
          </section>

          <section className="space-y-2" aria-labelledby="recent">
            <div className="flex items-center justify-between">
              <h2 id="recent" className="text-sm font-semibold text-text-primary">
                Recent activity
              </h2>
              <Link
                href={logbookPath()}
                className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-accent"
              >
                View all
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            {activity.length === 0 ? (
              <Card className="p-4 text-sm text-text-secondary">Visits you update show here.</Card>
            ) : (
              <Card className="divide-y divide-border">
                {activity.map((a) => (
                  <Link
                    key={a.visitId}
                    href={patientPath(a.patientId, { caseId: a.caseId })}
                    className="flex gap-3 px-4 py-3 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  >
                    <span className="w-14 shrink-0 text-sm tabular-nums text-text-secondary">{formatShortDate(a.date, today)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-text-primary">{a.patientName}</span>
                      <span className="block truncate text-sm text-text-secondary">
                        {[a.tooth, a.stages].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </section>

          <Link
            href={logbookPath()}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <BookOpen className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-text-primary">Logbook</span>
              <span className="block text-sm text-text-secondary">Every stage you&apos;ve done · export to Excel or PDF</span>
            </span>
            <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden />
          </Link>
        </>
      )}
    </div>
  );
}
