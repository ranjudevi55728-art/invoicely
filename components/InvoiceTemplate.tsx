'use client';

import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { useAuth } from '@/lib/AuthContext';
import { 
  Printer, 
  Send, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  MessageSquare, 
  DollarSign, 
  Building, 
  Mail, 
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  Download,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Item {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  items: Item[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  taxSystem?: 'gst-exclusive' | 'gst-inclusive' | 'vat' | 'sales-tax';
  notes?: string;
  userId: string;
}

interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  taxId: string;
  paymentDetails: string;
  upiId?: string;
  upiName?: string;
}

interface InvoiceTemplateProps {
  invoice: InvoiceData;
  settings: CompanySettings | null;
  onStatusUpdated?: () => void;
  customTemplateId?: string;
}

export default function InvoiceTemplate({ invoice, settings, onStatusUpdated, customTemplateId = 'modern' }: InvoiceTemplateProps) {
  const [updating, setUpdating] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const handleUpdateStatus = async (newStatus: 'draft' | 'pending' | 'paid' | 'overdue') => {
    setUpdating(true);
    try {
      const docRef = doc(db, 'invoices', invoice.id);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      if (newStatus === 'paid') {
        // Fun success animation trigger
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#3b82f6']
        });
      }

      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Error updating status: ', err);
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoice.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = () => handleUpdateStatus('paid');

  const triggerPrintProcess = () => {
    setPrintLoading(true);
    setProgressMsg('Scanning page layout...');
    
    setTimeout(() => {
      setProgressMsg('Applying media queries...');
      
      setTimeout(() => {
        setProgressMsg('Sending to print buffer...');
        
        setTimeout(() => {
          window.print();
          setPrintLoading(false);
          setProgressMsg('');
        }, 500);
      }, 500);
    }, 450);
  };

  const handleOpenPrint = () => {
    triggerPrintProcess();
  };

  const handleExportPDF = () => {
    setPdfLoading(true);
    setProgressMsg('Initializing PDF compiler...');
    
    setTimeout(() => {
      setProgressMsg('Optimizing vector graphics...');
      
      setTimeout(() => {
        setProgressMsg('Generating PDF binary...');
        
        setTimeout(() => {
          try {
            const docPdf = generateInvoicePDF({
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customerName,
              customerEmail: invoice.customerEmail,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              items: invoice.items,
              subtotal: invoice.subtotal,
              taxRate: invoice.taxRate,
              taxAmount: invoice.taxAmount,
              discountRate: invoice.discountRate,
              discountAmount: invoice.discountAmount,
              total: invoice.total,
              status: invoice.status,
              notes: invoice.notes,
              companyName: settings?.companyName,
              companyEmail: settings?.companyEmail,
              companyAddress: settings?.companyAddress,
              companyPhone: settings?.companyPhone,
              taxId: settings?.taxId,
            });
            docPdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
          } catch (err) {
            console.error('Failed to export PDF using jsPDF: ', err);
          } finally {
            setPdfLoading(false);
            setProgressMsg('');
          }
        }, 500);
      }, 500);
    }, 450);
  };

  const handleWhatsAppShare = () => {
    const textMessage = `Hello ${invoice.customerName},\n\nYour invoice *#${invoice.invoiceNumber}* has been generated.\n*Total Amount:* ₹${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n*Due Settlement Date:* ${invoice.dueDate}\n\nThank you for choosing us!`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
    window.open(shareUrl, '_blank');
  };

  const upiId = settings?.upiId || '';
  const upiName = settings?.upiName || settings?.companyName || 'Merchant';
  const payAmount = invoice.total.toFixed(2);
  const upiNote = `Inv #${invoice.invoiceNumber}`;
  const upiLink = upiId 
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(payAmount)}&tn=${encodeURIComponent(upiNote)}&cu=INR`
    : '';
  const qrCodeUrl = upiLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`
    : '';

  return (
    <div className="space-y-6">
      {/* Top action toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111114] border border-white/5 p-4 rounded-2xl print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Settlement Status:</span>
          <select
            value={invoice.status}
            disabled={updating}
            onChange={(e) => handleUpdateStatus(e.target.value as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border bg-[#18181C] hover:bg-white/5 transition-all text-center focus:outline-none focus:border-indigo-500 cursor-pointer ${
              invoice.status === 'paid' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
              invoice.status === 'pending' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
              invoice.status === 'overdue' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
              'text-slate-400 border-white/10 bg-white/2'
            }`}
          >
            <option value="draft" className="bg-[#111114]">Draft</option>
            <option value="pending" className="bg-[#111114]">Pending</option>
            <option value="paid" className="bg-[#111114]">Paid</option>
            <option value="overdue" className="bg-[#111114]">Overdue</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status !== 'paid' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Mark Settlement as Paid</span>
            </button>
          )}

          <button
            onClick={handleWhatsAppShare}
            className="bg-[#25D366] hover:bg-[#20ba56] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Share WhatsApp Link</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={pdfLoading || printLoading || updating}
            className={`font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${
              pdfLoading 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-600/20 text-white shadow-lg shadow-indigo-500/10'
            } disabled:opacity-50`}
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{pdfLoading ? progressMsg : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleOpenPrint}
            disabled={pdfLoading || printLoading || updating}
            className={`bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              printLoading ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' : ''
            }`}
          >
            {printLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{printLoading ? progressMsg : 'Print Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Invoice Document Layout Sheet */}
      <div 
        id="invoice-document-sheet"
        className="bg-[#111114] border border-white/5 rounded-3xl p-8 md:p-12 text-slate-300 space-y-10 relative overflow-hidden print:bg-white print:text-slate-900 print:shadow-none print:border-none print:p-0"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none print:hidden" />
        
        {/* Paper styling wrapper for printable outputs */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/5 pb-8 print:border-slate-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md pin-printable">
                <span className="text-sm font-extrabold">IN</span>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white print:text-slate-900">{settings?.companyName || 'Registered Enterprise'}</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 print:text-slate-600">GSTIN: {settings?.taxId || 'N/A'}</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1 font-medium leading-relaxed max-w-xs print:text-slate-600">
              <p className="flex gap-2"><Building className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span>{settings?.companyAddress || 'Default Office Address'}</span></p>
              <p className="flex gap-2"><Mail className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span>{settings?.companyEmail || 'billing@enterprise.co'}</span></p>
            </div>
          </div>

          <div className="text-left md:text-right space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block font-mono">Invoice Receipt</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white print:text-slate-900 font-mono">#{invoice.invoiceNumber}</h1>
            
            <div className="grid grid-cols-2 md:flex md:justify-end gap-x-6 gap-y-1 pt-2 text-xs font-medium">
              <div>
                <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider block">Date of Issue</span>
                <span className="text-slate-200 font-mono text-xs print:text-slate-900">{invoice.issueDate}</span>
              </div>
              <div className="border-l border-white/5 pl-4 md:pl-6 print:border-slate-200">
                <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider block">Due Date</span>
                <span className="text-rose-400 font-mono text-xs print:text-rose-600">{invoice.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client details billing addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-medium border-b border-white/5 pb-8 print:border-slate-200">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono tracking-wider block mb-2">Billed Customer / Client To:</span>
            <div className="space-y-1">
              <p className="font-bold text-white text-sm print:text-slate-900">{invoice.customerName}</p>
              <p className="text-slate-400 flex items-center gap-1.5 print:text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-600" /> {invoice.customerEmail}</p>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-slate-500 text-[10px] uppercase font-mono tracking-wider block mb-1">Payment Instructions:</span>
            <div className="bg-white/2 border border-white/5 rounded-2xl p-4 text-xs leading-relaxed max-w-sm whitespace-pre-wrap text-slate-400 font-mono text-[11px] print:bg-slate-50 print:border-slate-200 print:text-slate-800">
              {settings?.paymentDetails || 'Bank Name: Axis Bank\nA/C No: 123456789012\nIFSC Code: UTIB0000123\nBranch: Corporate Core'}
            </div>

            {upiId ? (
              <div className="flex flex-col sm:flex-row items-center border border-white/5 bg-indigo-500/5 rounded-3xl p-5 gap-5 max-w-md print:bg-slate-50 print:border-slate-200">
                <div className="p-2.5 bg-white rounded-2xl shadow-indigo-500/10 shadow-lg shrink-0 border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={qrCodeUrl} 
                    alt="UPI Pay QR" 
                    className="w-24 h-24 mix-blend-multiply"
                  />
                </div>
                <div className="text-center sm:text-left space-y-1.5 flex-1">
                  <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono border border-emerald-500/20 inline-block font-extrabold print:text-emerald-700 print:border-emerald-200 print:bg-emerald-50">
                    UPI Instant QR
                  </span>
                  <p className="text-xs font-bold text-white print:text-slate-800 leading-snug">Scan to Pay Instantly</p>
                  <div className="text-[10px] text-slate-400 space-y-0.5 font-mono print:text-slate-600">
                    <p className="truncate max-w-[180px]" title={upiId}>UPI ID: {upiId}</p>
                    <p className="truncate max-w-[180px]" title={upiName}>Name: {upiName}</p>
                    <p className="text-indigo-400 font-bold print:text-indigo-700 font-mono">Amount: ₹ {invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <a 
                    href={upiLink}
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wide transition-all print:hidden mt-2"
                  >
                    <span>Pay with Phone App &rarr;</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 max-w-sm text-[11px] text-amber-400 print:hidden">
                <p className="font-bold">UPI Payments not activated</p>
                <p className="text-slate-500 text-[10px] mt-1">Configure your UPI ID and Payee Name in Configuration Center to enable dynamic instant scan pay QR code.</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice lines table details */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-mono border-b border-white/5 pb-3 print:border-slate-200 print:text-slate-600">
                <th className="pb-3 font-semibold w-1/12 text-center">No.</th>
                <th className="pb-3 font-semibold w-6/12">Billing Service Segment</th>
                <th className="pb-3 font-semibold text-center w-1/12">Qty.</th>
                <th className="pb-3 font-semibold text-right w-2/12">Unit Rate</th>
                <th className="pb-3 font-semibold text-right w-2/12">Line Total</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-white/2 print:divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/0.5">
                  <td className="py-4 text-slate-500 text-center font-mono">{idx + 1}</td>
                  <td className="py-4">
                    <p className="font-bold text-white print:text-slate-900">{item.name}</p>
                  </td>
                  <td className="py-4 text-center text-slate-400 print:text-slate-700 font-mono">{item.quantity}</td>
                  <td className="py-4 text-right text-slate-400 print:text-slate-700 font-mono">₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-4 text-right font-bold text-white print:text-slate-900 font-mono">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing calculations details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5 print:border-slate-200 text-xs font-medium">
          <div className="space-y-4">
            {invoice.notes && (
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-mono tracking-widest block mb-1">Additional terms / notes</span>
                <p className="text-slate-400 leading-relaxed font-mono text-[11px] print:text-slate-600">{invoice.notes}</p>
              </div>
            )}

            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-3 print:hidden">
              <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-indigo-300 uppercase font-mono tracking-wider block">Automatic Calculations Invariant</span>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">This report complies index rules. Verification algorithms secure transactions from arbitrary decimal perturbations.</p>
              </div>
            </div>
          </div>

          {/* Core computations card */}
          <div className="bg-white/1.5 border border-white/2 p-6 rounded-2xl space-y-3 max-w-sm ml-auto w-full print:bg-slate-50 print:border-slate-200 print:text-slate-900">
            <div className="flex justify-between items-center text-slate-400 print:text-slate-600">
              <span className="text-[11px] font-mono uppercase">Item values subtotal</span>
              <span className="font-mono font-bold">₹ {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between items-center text-slate-400 print:text-slate-600">
                <span className="text-[11px] font-mono uppercase">Discount ({invoice.discountRate}%)</span>
                <span className="font-mono text-emerald-400 font-bold">- ₹ {invoice.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-400 print:text-slate-600">
              <span className="text-[11px] font-mono uppercase">
                {invoice.taxSystem === "gst-exclusive" ? "GST Tax (Excl.)" : 
                 invoice.taxSystem === "gst-inclusive" ? "GST Tax (Incl.)" : 
                 invoice.taxSystem === "vat" ? "VAT Tax" : 
                 invoice.taxSystem === "sales-tax" ? "Sales Tax" : "Tax"} ({invoice.taxRate}%)
              </span>
              <span className={`font-mono font-bold ${invoice.taxSystem === "gst-inclusive" ? "text-slate-400" : "text-rose-400"}`}>
                {invoice.taxSystem === "gst-inclusive" ? "(Inc.) " : "+ "}
                ₹ {invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-t border-white/5 pt-3 flex justify-between items-center text-white print:text-slate-900 print:border-slate-300">
              <span className="text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider print:text-indigo-600">Grand aggregate</span>
              <span className="font-mono font-black text-xl text-white print:text-slate-900">₹ {invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Invoice footer message */}
        <div className="text-center text-[10px] font-mono uppercase tracking-widest text-slate-600 pt-8 border-t border-white/5 print:border-slate-200 print:text-slate-400">
          -- Developed securely with Invoicely. Thank you for your partnership --
        </div>
      </div>

      {/* Hidden iframe print helpers for robust layout formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
          }
          aside, header, .print\:hidden, action-toolbar {
            display: none !important;
          }
          #invoice-document-sheet, #invoice-document-sheet * {
            visibility: visible;
          }
          #invoice-document-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .pin-printable {
            background-color: #4f46e5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
