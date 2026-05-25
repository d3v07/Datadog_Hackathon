import PDFDocument from "pdfkit";

// Mirrors the public invoice shape returned by GET /v1/billing/invoices.
// Lives here (not in routes) so the generator stays framework-free and
// trivially testable.
export interface InvoiceForPdf {
  id: string;
  period: string;
  amountUsdCents: number;
  status: string;
  issuedAt: string;
  plan?: string;
  paymentIntentId?: string;
  paidAt?: string;
}

export interface OrgForPdf {
  name: string;
  seatCount?: number;
  billingEmail?: string;
}

export interface InvoicePdfInput {
  invoice: InvoiceForPdf;
  org: OrgForPdf;
}

// Brand palette — kept inline so the generator has no external style deps.
const NAVY = "#0f172a";
const SLATE = "#64748b";
const BORDER = "#cbd5e1";

const PAGE_MARGIN = 72; // 1 inch in PDF points
const TAX_RATE = 0; // Stripe-handled, displayed as a row for legibility.

function dollars(cents: number): string {
  return (
    "$" +
    (cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function descriptionFor(invoice: InvoiceForPdf): string {
  const plan = (invoice.plan ?? "Subscription").replace(/^./, (c) => c.toUpperCase());
  return `${plan} subscription — ${invoice.period}`;
}

function drawHeader(doc: PDFKit.PDFDocument, invoice: InvoiceForPdf): void {
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(26).text("UNSYPHN", PAGE_MARGIN, PAGE_MARGIN);

  const rightX = doc.page.width - PAGE_MARGIN - 220;
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("INVOICE", rightX, PAGE_MARGIN, { width: 220, align: "right" });
  doc
    .fillColor(SLATE)
    .font("Helvetica")
    .fontSize(10)
    .text(`Invoice no. ${invoice.id}`, rightX, PAGE_MARGIN + 26, { width: 220, align: "right" })
    .text(`Issued ${formatDate(invoice.issuedAt)}`, rightX, PAGE_MARGIN + 40, {
      width: 220,
      align: "right",
    });
}

function drawBillTo(doc: PDFKit.PDFDocument, org: OrgForPdf): number {
  const top = PAGE_MARGIN + 90;
  doc.fillColor(SLATE).font("Helvetica").fontSize(9).text("BILL TO", PAGE_MARGIN, top);
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(org.name, PAGE_MARGIN, top + 14);

  const lines: string[] = [];
  if (typeof org.seatCount === "number") {
    lines.push(`${org.seatCount.toLocaleString("en-US")} seats`);
  }
  if (org.billingEmail) lines.push(org.billingEmail);

  doc.fillColor(SLATE).font("Helvetica").fontSize(10);
  let y = top + 30;
  for (const line of lines) {
    doc.text(line, PAGE_MARGIN, y);
    y += 14;
  }
  return y;
}

interface Column {
  label: string;
  x: number;
  width: number;
  align: "left" | "right";
}

function drawItemsTable(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceForPdf,
  startY: number,
): number {
  const left = PAGE_MARGIN;
  const right = doc.page.width - PAGE_MARGIN;
  const contentWidth = right - left;

  const columns: Column[] = [
    { label: "Description", x: left, width: contentWidth - 240, align: "left" },
    {
      label: "Period",
      x: left + (contentWidth - 240),
      width: 140,
      align: "left",
    },
    { label: "Amount", x: right - 100, width: 100, align: "right" },
  ];

  // Header row
  doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(9);
  for (const col of columns) {
    doc.text(col.label.toUpperCase(), col.x, startY, {
      width: col.width,
      align: col.align,
    });
  }
  const headerBottom = startY + 16;
  doc
    .strokeColor(BORDER)
    .lineWidth(0.75)
    .moveTo(left, headerBottom)
    .lineTo(right, headerBottom)
    .stroke();

  // Data row
  const rowY = headerBottom + 12;
  doc.fillColor(NAVY).font("Helvetica").fontSize(10);
  doc.text(descriptionFor(invoice), columns[0]!.x, rowY, {
    width: columns[0]!.width,
    align: "left",
  });
  doc.text(invoice.period, columns[1]!.x, rowY, {
    width: columns[1]!.width,
    align: "left",
  });
  doc.text(dollars(invoice.amountUsdCents), columns[2]!.x, rowY, {
    width: columns[2]!.width,
    align: "right",
  });

  return rowY + 30;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceForPdf,
  startY: number,
): number {
  const right = doc.page.width - PAGE_MARGIN;
  const labelX = right - 240;
  const valueX = right - 100;

  const subtotal = invoice.amountUsdCents;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  doc
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .moveTo(labelX, startY)
    .lineTo(right, startY)
    .stroke();

  let y = startY + 10;
  const rows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: "Subtotal", value: dollars(subtotal) },
    { label: "Tax", value: dollars(tax) },
    { label: "Total", value: dollars(total), bold: true },
  ];

  for (const row of rows) {
    doc.fillColor(row.bold ? NAVY : SLATE);
    doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(row.bold ? 12 : 10);
    doc.text(row.label, labelX, y, { width: 140, align: "left" });
    doc.text(row.value, valueX, y, { width: 100, align: "right" });
    y += row.bold ? 22 : 16;
  }
  return y;
}

function drawFooter(doc: PDFKit.PDFDocument, invoice: InvoiceForPdf): void {
  const bottom = doc.page.height - PAGE_MARGIN;
  const parts = ["Paid via Stripe"];
  if (invoice.paymentIntentId) parts.push(invoice.paymentIntentId);
  if (invoice.paidAt) parts.push(`paid ${formatDate(invoice.paidAt)}`);

  doc
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, bottom - 40)
    .lineTo(doc.page.width - PAGE_MARGIN, bottom - 40)
    .stroke();

  doc
    .fillColor(SLATE)
    .font("Helvetica")
    .fontSize(9)
    .text(parts.join(" · "), PAGE_MARGIN, bottom - 28, {
      width: doc.page.width - PAGE_MARGIN * 2,
      align: "left",
    })
    .text(
      "Unsyphn Inc. · Payment receipt for services rendered. Retain for your records.",
      PAGE_MARGIN,
      bottom - 14,
      { width: doc.page.width - PAGE_MARGIN * 2, align: "left" },
    );
}

export function generateInvoicePdf({ invoice, org }: InvoicePdfInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
      info: {
        Title: `Unsyphn invoice ${invoice.id}`,
        Author: "Unsyphn",
        Subject: descriptionFor(invoice),
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, invoice);
    const billToBottom = drawBillTo(doc, org);
    const itemsBottom = drawItemsTable(doc, invoice, billToBottom + 32);
    drawTotals(doc, invoice, itemsBottom);
    drawFooter(doc, invoice);

    doc.end();
  });
}
