import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getCurrentPg } from "@/lib/pg/current";
import { getLogEntries, getProgressCases, getSpecialtiesAndCaseTypes } from "@/lib/data/progress";
import { logbookEntries } from "@/lib/progress/count";
import { parseLogbookQuery } from "@/lib/progress/query";
import { LOGBOOK_COLUMNS, exportDate, exportFileName, headerLines, logbookRow, type LogbookRow } from "@/lib/progress/export";
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

  const body = format === "xlsx" ? await toXlsx(header, rows) : await toPdf(header, rows);
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

async function toXlsx(header: string[], rows: LogbookRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OraMedha Lite";
  const ws = wb.addWorksheet("Logbook");
  header.forEach((line, i) => {
    const row = ws.addRow([line]);
    row.font = { bold: i === 0, size: i === 0 ? 13 : 11 };
  });
  ws.addRow([]);
  const head = ws.addRow([...LOGBOOK_COLUMNS]);
  head.font = { bold: true };
  const headRow = head.number;
  rows.forEach((r) => ws.addRow(r));
  ws.columns = [12, 10, 26, 8, 22, 24, 11, 12].map((width) => ({ width }));
  ws.views = [{ state: "frozen", ySplit: headRow }];
  ws.autoFilter = { from: { row: headRow, column: 1 }, to: { row: headRow, column: LOGBOOK_COLUMNS.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function toPdf(header: string[], rows: LogbookRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, info: { Title: "Logbook", Creator: "OraMedha Lite" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const usable = doc.page.width - left - doc.page.margins.right;
    const weights = [11, 8, 22, 6, 18, 20, 9, 8];
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / total) * usable);
    const bottom = doc.page.height - doc.page.margins.bottom - 16;

    doc.font("Helvetica-Bold").fontSize(14).text(header[0]!, { width: usable });
    doc.font("Helvetica").fontSize(10);
    for (const line of header.slice(1)) doc.text(line, { width: usable });
    doc.moveDown(0.8);

    const drawRow = (cells: readonly string[], bold: boolean) => {
      const y = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      let x = left;
      cells.forEach((cell, i) => {
        doc.text(cell, x + 2, y, { width: widths[i]! - 4, lineBreak: false, ellipsis: true });
        x += widths[i]!;
      });
      doc.y = y + 16;
      doc.moveTo(left, doc.y - 3).lineTo(left + usable, doc.y - 3).lineWidth(bold ? 0.8 : 0.3).stroke();
    };

    drawRow(LOGBOOK_COLUMNS, true);
    if (rows.length === 0) doc.font("Helvetica").fontSize(10).text("No entries for this filter.", left, doc.y + 4);
    for (const r of rows) {
      if (doc.y > bottom) {
        doc.addPage();
        drawRow(LOGBOOK_COLUMNS, true);
      }
      drawRow(r, false);
    }
    doc.end();
  });
}
