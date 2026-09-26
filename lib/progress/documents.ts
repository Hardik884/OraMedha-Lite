import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { LOGBOOK_COLUMNS, type LogbookRow } from "./export";

/**
 * The logbook as an Excel workbook or a PDF, built in memory (never written
 * to disk). Rows come from logbookRow(), which has no phone column.
 * Server-side only (it reads font files with node:fs).
 */

/*
 * Noto Sans Devanagari covers English and Hindi/Marathi in one font, so a
 * patient name in either script prints correctly (the PDF's built-in
 * Helvetica can't draw Devanagari). Read once per server process.
 */
let fonts: { regular: Buffer; bold: Buffer } | null = null;
function pdfFonts() {
  fonts ??= {
    regular: readFileSync(join(process.cwd(), "assets/fonts/NotoSansDevanagari-Regular.ttf")),
    bold: readFileSync(join(process.cwd(), "assets/fonts/NotoSansDevanagari-Bold.ttf")),
  };
  return fonts;
}

export async function logbookXlsx(header: string[], rows: LogbookRow[]): Promise<Buffer> {
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

export function logbookPdf(header: string[], rows: LogbookRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 36,
      bufferPages: true, // to number the pages once the total is known
      info: { Title: "Logbook", Creator: "OraMedha Lite" },
    });
    const { regular, bold } = pdfFonts();
    doc.registerFont("Body", regular);
    doc.registerFont("Body-Bold", bold);
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

    doc.font("Body-Bold").fontSize(14).text(header[0]!, { width: usable });
    doc.font("Body").fontSize(10);
    for (const line of header.slice(1)) doc.text(line, { width: usable });
    doc.moveDown(0.8);

    const drawRow = (cells: readonly string[], bold: boolean) => {
      const y = doc.y;
      doc.font(bold ? "Body-Bold" : "Body").fontSize(9);
      let x = left;
      cells.forEach((cell, i) => {
        doc.text(cell, x + 2, y, { width: widths[i]! - 4, lineBreak: false, ellipsis: true });
        x += widths[i]!;
      });
      doc.y = y + 16;
      doc.moveTo(left, doc.y - 3).lineTo(left + usable, doc.y - 3).lineWidth(bold ? 0.8 : 0.3).stroke();
    };

    drawRow(LOGBOOK_COLUMNS, true);
    if (rows.length === 0) doc.font("Body").fontSize(10).text("No entries for this filter.", left, doc.y + 4);
    for (const r of rows) {
      if (doc.y > bottom) {
        doc.addPage();
        drawRow(LOGBOOK_COLUMNS, true);
      }
      drawRow(r, false);
    }

    // "Page 2 of 5" at the foot of every page.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const margin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // writing in the margin must not start a new page
      doc.font("Body").fontSize(8).text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - margin + 8, {
        width: usable,
        align: "right",
        lineBreak: false,
      });
      doc.page.margins.bottom = margin;
    }
    doc.end();
  });
}
