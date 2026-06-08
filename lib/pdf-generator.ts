import { jsPDF } from "jspdf";
import { Invoice } from "./types";

export function generateInvoicePDF(invoice: Invoice) {
  // Create jsPDF instance (A4 size, portrait, mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Dark Theme palette matching screenshot exactly
  const BG_COLOR = { r: 9, g: 11, b: 15 };     // #090b0f
  const CARD_BG = { r: 13, g: 16, b: 23 };    // #0d1017
  const TEXT_WHITE = { r: 255, g: 255, b: 255 };
  const TEXT_SLATE = { r: 148, g: 163, b: 184 }; // #94a3b8
  const TEXT_MUTED = { r: 100, g: 116, b: 139 }; // #64748b
  const INDIGO = { r: 99, g: 102, b: 241 };     // #6366f1
  const INDIGO_LIGHT = { r: 129, g: 140, b: 248 }; // #818cf8
  const EMERALD = { r: 16, g: 185, b: 129 };    // #10b981
  const AMBER = { r: 245, g: 158, b: 11 };     // #f59e0b
  const ROSE = { r: 244, g: 63, b: 94 };       // #f43f5e

  // Status color determination
  let statusColor = INDIGO;
  if (invoice.status === "paid") {
    statusColor = EMERALD;
  } else if (invoice.status === "pending") {
    statusColor = AMBER;
  } else if (invoice.status === "overdue") {
    statusColor = ROSE;
  }

  // 1. Draw full-bleed dark canvas body
  doc.setFillColor(BG_COLOR.r, BG_COLOR.g, BG_COLOR.b);
  doc.rect(0, 0, 210, 297, "F");

  // Premium neon top aesthetic line
  doc.setFillColor(INDIGO.r, INDIGO.g, INDIGO.b);
  doc.rect(0, 0, 210, 3.5, "F");

  let y = 18;

  // 2. Main Title Brand Block
  // Miniature applet logo button mimic
  doc.setFillColor(INDIGO.r, INDIGO.g, INDIGO.b);
  doc.rect(16, y, 9, 9, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("I", 20.5, y + 6.2, { align: "center" });

  // Logo Typography Text
  doc.setFontSize(15);
  doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  doc.text("Invoicely", 29, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text("PREMIUM ACCOUNT", 29, y + 8.5);

  // Invoice Identifier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  doc.text(invoice.invoiceNumber, 194, y + 4.5, { align: "right" });

  // Status Badge Label
  doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
  doc.rect(164, y + 7, 30, 4.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.status.toUpperCase(), 179, y + 10.2, { align: "center" });

  y += 20;

  // Separator rule
  doc.setDrawColor(27, 31, 43);
  doc.setLineWidth(0.35);
  doc.line(16, y, 194, y);

  y += 10;

  // 3. Sender / Receiver cards (simulates CSS cards)
  doc.setFillColor(CARD_BG.r, CARD_BG.g, CARD_BG.b);
  doc.rect(16, y, 86, 32, "F"); // Sender card
  doc.rect(108, y, 86, 32, "F"); // Receiver card

  // Sender Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(INDIGO_LIGHT.r, INDIGO_LIGHT.g, INDIGO_LIGHT.b);
  doc.text("BILLED FROM", 21, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  doc.text("Invoicely Consultant Group", 21, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  doc.text("billing@invoicely.app", 21, y + 20);
  doc.setFontSize(7.5);
  doc.text("Enterprise Cloud Sync Active", 21, y + 25.5);

  // Receiver Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(INDIGO_LIGHT.r, INDIGO_LIGHT.g, INDIGO_LIGHT.b);
  doc.text("BILLED TO / CURRENT CLIENT", 113, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  let recipient = invoice.clientName;
  if (recipient.length > 28) recipient = recipient.substring(0, 25) + "...";
  doc.text(recipient, 113, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  let recipientEmail = invoice.clientEmail;
  if (recipientEmail.length > 28) recipientEmail = recipientEmail.substring(0, 25) + "...";
  doc.text(recipientEmail, 113, y + 20);
  doc.setFontSize(7.5);
  doc.text("Verified Customer Profile", 113, y + 25.5);

  y += 38;

  // 4. Compact Date terms bar
  doc.setFillColor(CARD_BG.r, CARD_BG.g, CARD_BG.b);
  doc.rect(16, y, 178, 12, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  doc.text("DATE OF ISSUE:", 21, y + 7.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  doc.text(invoice.issueDate, 46, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  doc.text("DUE PAYMENT DATE:", 110, y + 7.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  if (invoice.status === "overdue") {
    doc.setTextColor(ROSE.r, ROSE.g, ROSE.b);
  } else {
    doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
  }
  doc.text(invoice.dueDate, 142, y + 7.5);

  y += 20;

  // 5. Line items label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  doc.text("ITEMIZED DESCRIPTION", 16, y);

  y += 4.5;

  // Table Headers background bar
  doc.setFillColor(20, 24, 34);
  doc.rect(16, y, 178, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(INDIGO_LIGHT.r, INDIGO_LIGHT.g, INDIGO_LIGHT.b);
  doc.text("Description / Particulars", 21, y + 5.5);
  doc.text("Qty", 120, y + 5.5, { align: "center" });
  doc.text("Price (INR)", 152, y + 5.5, { align: "right" });
  doc.text("Total (INR)", 190, y + 5.5, { align: "right" });

  y += 8;

  // Render list items dynamically
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  invoice.items.forEach((item, index) => {
    // Row striping colors
    if (index % 2 === 0) {
      doc.setFillColor(13, 16, 23);
    } else {
      doc.setFillColor(9, 11, 15);
    }
    doc.rect(16, y, 178, 9.5, "F");

    // Divider line
    doc.setDrawColor(24, 28, 41);
    doc.line(16, y + 9.5, 194, y + 9.5);

    // Text particulars
    doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
    let desc = item.description;
    if (desc.length > 51) desc = desc.substring(0, 48) + "...";
    doc.text(desc, 21, y + 6);

    doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
    doc.text(item.quantity.toString(), 120, y + 6, { align: "center" });
    doc.text(`Rs. ${item.price.toFixed(2)}`, 152, y + 6, { align: "right" });

    // Individual cumulative price
    doc.setTextColor(TEXT_WHITE.r, TEXT_WHITE.g, TEXT_WHITE.b);
    doc.setFont("helvetica", "bold");
    const aggregateValue = item.quantity * item.price;
    doc.text(`Rs. ${aggregateValue.toFixed(2)}`, 190, y + 6, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 9.5;
  });

  // Grand summary table block
  doc.setFillColor(20, 24, 34);
  doc.rect(16, y, 178, 11, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
  doc.text("GRAND BILLING TOTAL (INR)", 21, y + 7);

  doc.setFontSize(10.5);
  doc.setTextColor(INDIGO_LIGHT.r, INDIGO_LIGHT.g, INDIGO_LIGHT.b);
  doc.text(`Rs. ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, y + 7, { align: "right" });

  y += 20;

  // 6. Notes section if present
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text("PAYMENT NOTES AND EXPLANATORY TERMS", 16, y);

    y += 4;

    doc.setFillColor(13, 16, 23);
    const splitNotes = doc.splitTextToSize(invoice.notes, 166);
    const calculatedHeight = Math.max(12, splitNotes.length * 4.5 + 7);
    doc.rect(16, y, 178, calculatedHeight, "F");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_SLATE.r, TEXT_SLATE.g, TEXT_SLATE.b);
    
    splitNotes.forEach((line: string, index: number) => {
      doc.text(line, 21, y + 5.5 + (index * 4));
    });

    y += calculatedHeight + 10;
  }

  // 7. Footer decoration bar
  doc.setFillColor(INDIGO.r, INDIGO.g, INDIGO.b);
  doc.rect(16, 281, 178, 0.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  doc.text("AUTO-DIGIT REGISTRY: INVOICELY NODE PRIME", 16, 286);
  doc.text("INTEGRITY SYNCHRONIZED SECURE LEDGERS", 194, 286, { align: "right" });

  // Expose triggers
  const outputFileName = `${invoice.invoiceNumber.replace(/\s+/g, "_")}_Invoice.pdf`;
  doc.save(outputFileName);
}
