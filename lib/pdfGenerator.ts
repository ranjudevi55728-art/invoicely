import { jsPDF } from 'jspdf';

export interface PDFInvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  items: { name: string; quantity: number; rate: number; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  status: string;
  notes?: string;
  companyName?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyPhone?: string;
  taxId?: string;
}

export function generateInvoicePDF(data: PDFInvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette
  const primaryBg = [11, 11, 12]; // #0B0B0C (Deep gray)
  const textWhite = [255, 255, 255];
  const textDark = [24, 24, 28]; // #18181C
  const textGray = [113, 113, 122]; // #71717A
  const borderLight = [228, 228, 231]; // #E4E4E7
  const accentIndigo = [99, 102, 241]; // #6366F1
  const successGreenBg = [209, 250, 229]; // Paid badge bg
  const successGreenText = [16, 185, 129]; // Paid text
  const warningAmberBg = [254, 243, 199]; // Pending bg
  const warningAmberText = [217, 119, 6]; // Pending text

  // Logo Initials Badge
  doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
  doc.roundedRect(14, 15, 12, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('IN', 17, 23);

  // Company Name & Details (Left side)
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const companyName = data.companyName || 'Registered Enterprise';
  doc.text(companyName, 29, 21);

  doc.setFont('helvetica', 'medium');
  doc.setFontSize(8);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  const taxId = data.taxId ? `GSTIN / Tax ID: ${data.taxId}` : 'GSTIN / Tax ID: Not Registered';
  doc.text(taxId, 29, 26);

  // Company Address Line Wrapping
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const companyAddress = data.companyAddress || 'Default Office HQ Address';
  const addressLines = doc.splitTextToSize(companyAddress, 70);
  doc.text(addressLines, 14, 34);

  const companyEmailAndPhone = `${data.companyEmail || 'billing@enterprise.co'}  |  ${data.companyPhone || '+91 8888 888 888'}`;
  doc.text(companyEmailAndPhone, 14, 34 + (addressLines.length * 4.2));

  // Invoice details (Right side)
  doc.setTextColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INVOICE RECEIPT', 200 - 14, 19, { align: 'right' });

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`#${data.invoiceNumber}`, 200 - 14, 27, { align: 'right' });

  // Status Banner
  const statusUpper = (data.status || 'pending').toUpperCase();
  const isPaid = statusUpper === 'PAID';
  const badgeColorBg = isPaid ? successGreenBg : warningAmberBg;
  const badgeColorText = isPaid ? successGreenText : warningAmberText;

  // Draw status pill bg
  doc.setFillColor(badgeColorBg[0], badgeColorBg[1], badgeColorBg[2]);
  doc.roundedRect(150, 31, 36, 6, 1.5, 1.5, 'F');
  // Draw text
  doc.setTextColor(badgeColorText[0], badgeColorText[1], badgeColorText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusUpper, 168, 35.2, { align: 'center' });

  // Divider Line
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.4);
  doc.line(14, 52, 200 - 14, 52);

  // Customer Billing Details Header (Billing To info)
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLING RECIPIENT', 14, 60);

  // Customer info
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.customerName, 14, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(data.customerEmail, 14, 71);

  // Billing Dates metadata (Right block)
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATE DETAILS', 125, 60);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Issue Date:  ${data.issueDate}`, 125, 66);
  doc.text(`Due Date:    ${data.dueDate}`, 125, 71);

  // Items Table Section
  const tableTopY = 82;
  
  // Header row bg
  doc.setFillColor(primaryBg[0], primaryBg[1], primaryBg[2]);
  doc.roundedRect(14, tableTopY, 200 - 28, 7.5, 1, 1, 'F');

  // Header column labels
  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ITEM / SERVICE DESCRIPTION', 18, tableTopY + 5);
  doc.text('QTY', 125, tableTopY + 5, { align: 'center' });
  doc.text('UNIT RATE', 152, tableTopY + 5, { align: 'right' });
  doc.text('SUM AMOUNT', 182, tableTopY + 5, { align: 'right' });

  let curY = tableTopY + 7.5;

  // Render Table items
  data.items.forEach((item, index) => {
    // Row height sizing
    const rowHeight = 9.5;
    
    // Draw thin bottom boundary line
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.25);
    doc.line(14, curY + rowHeight, 200 - 14, curY + rowHeight);

    // Text details
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'normal');
    if (item.name.length > 55) {
      doc.setFontSize(7.5);
    } else {
      doc.setFontSize(8.5);
    }
    
    // Wrap description names
    const splitName = doc.splitTextToSize(item.name, 100);
    const textOffsetY = splitName.length > 1 ? 4 : 5.8;
    doc.text(splitName, 18, curY + textOffsetY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(item.quantity.toString(), 125, curY + 5.8, { align: 'center' });
    
    doc.text(`INR ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 152, curY + 5.8, { align: 'right' });

    doc.setFont('helvetica', 'semibold');
    doc.text(`INR ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 182, curY + 5.8, { align: 'right' });

    curY += rowHeight;
  });

  // Pricing Summaries block
  curY += 8;

  // Notes left column (if exists)
  if (data.notes) {
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TERMS & NOTES', 14, curY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const wrappedNotes = doc.splitTextToSize(data.notes, 95);
    doc.text(wrappedNotes, 14, curY + 4.5);
  }

  // Cost calculations column (right aligned)
  const calcStartX = 120;
  
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  doc.text('Items Subtotal:', calcStartX, curY);
  doc.text(`INR ${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 182, curY, { align: 'right' });

  curY += 5.2;

  doc.text(`VAT/GST Tax (${data.taxRate}%):`, calcStartX, curY);
  doc.setTextColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
  doc.text(`+ INR ${data.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 182, curY, { align: 'right' });

  if (data.discountRate > 0) {
    curY += 5.2;
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Trade Discount (${data.discountRate}%):`, calcStartX, curY);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`- INR ${data.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 182, curY, { align: 'right' });
  }

  curY += 7.5;

  // Solid highlight container for Total
  doc.setFillColor(primaryBg[0], primaryBg[1], primaryBg[2]);
  doc.roundedRect(calcStartX - 2, curY - 4.5, 200 - calcStartX - 10, 8.5, 1, 1, 'F');

  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COMPILED TOTAL:', calcStartX, curY + 1);

  doc.setFontSize(10.5);
  doc.text(`INR ${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 182, curY + 1, { align: 'right' });

  // Clean professional small watermark/footer info
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Invoices compiled automatically via Invoicely AI Service.', 14, 285);
  doc.text('This is a computer generated document requiring no physical signatures.', 200 - 14, 285, { align: 'right' });

  return doc;
}
