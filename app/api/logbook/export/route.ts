import { NextResponse, type NextRequest } from "next/server";
import { getCurrentPg } from "@/lib/pg/current";
import { getLogEntries, getProgressCases, getSpecialtiesAndCaseTypes } from "@/lib/data/progress";
import { logbookEntries } from "@/lib/progress/count";
import { parseLogbookQuery } from "@/lib/progress/query";
import { exportDate, exportFileName, headerLines, logbookRow } from "@/lib/progress/export";
import { logbookPdf, logbookXlsx } from "@/lib/progress/documents";
import { istToday } from "@/lib/dates";

/**
 * GET /api/logbook/export?format=xlsx|pdf&caseType=&period=&from=&to=
 *
 * The signed-in PG's logbook, filtered exactly as on screen, built in memory
 * and sent straight back — never written to disk or storage. Row Level
 * Security means only their own entries can be read. No phone numbers.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const current = await getCurrentPg();
  if (current.state !== "ready") return new NextResponse("Sign in", { status: 401, headers: NO_STORE });
  const pg = current.pg;

  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "xlsx";
  const today = istToday();

  const [{ specialties, caseTypes }, cases] = await Promise.all([getSpecialtiesAndCaseTypes(), getProgressCases()]);
  const specialtyIds = new Set([pg.specialty.id, ...cases.map((c) => c.specialtyId)]);
  // The PG's own specialty first, then the others, each in template order.
  const mine = caseTypes
    .filter((t) => specialtyIds.has(t.specialtyId))
    .sort((a, b) => Number(b.specialtyId === pg.specialty.id) - Number(a.specialtyId === pg.specialty.id) || a.sortOrder - b.sortOrder);
  const filter = parseLogbookQuery(
    { caseType: sp.get("caseType") ?? undefined, period: sp.get("period") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    today,
    mine.map((t) => t.id),
  );
  const entries = logbookEntries(
    await getLogEntries({ period: filter.period, caseTypeId: filter.caseTypeId }),
    filter.period,
    filter.caseTypeId,
  ).filter((e) => mine.some((t) => t.id === e.caseTypeId));

  const caseType = mine.find((t) => t.id === filter.caseTypeId);
  const specialtyNames = [...specialtyIds].map((id) => specialties.find((s) => s.id === id)?.name).filter(Boolean);
  const header = headerLines(
    {
      pgName: pg.fullName,
      college: pg.college,
      specialty: caseType ? (specialties.find((s) => s.id === caseType.specialtyId)?.name ?? pg.specialty.name) : specialtyNames.join(", "),
      periodLabel: periodText(filter.period),
      caseType: caseType?.name ?? null,
    },
    exportDate(today),
  );
  const rows = entries.map(logbookRow);
  const fileName = exportFileName(filter.period, format);

  const body = format === "xlsx" ? await logbookXlsx(header, rows) : await logbookPdf(header, rows);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      ...NO_STORE,
      "Content-Type":
        format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

/** Dates in full for a document that's read later: "1 Sep 2026 – 30 Sep 2026". */
function periodText(p: { from: string | null; to: string | null }): string {
  if (p.from && p.to) return `${exportDate(p.from)} – ${exportDate(p.to)}`;
  if (p.from) return `From ${exportDate(p.from)}`;
  if (p.to) return `Until ${exportDate(p.to)}`;
  return "All time";
}
