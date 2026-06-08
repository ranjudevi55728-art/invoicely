"use client";

import React from "react";
import { Invoice, InvoiceStatus } from "../lib/types";
import { X, Calendar, Mail, FileText, CheckCircle2, AlertTriangle, Trash, Edit, FileDown } from "lucide-react";
import { generateInvoicePDF } from "../lib/pdf-generator";

interface InvoiceDetailsProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onMarkStatus: (id: string, status: InvoiceStatus) => void;
}

export default function InvoiceDetails({
  invoice,
  onClose,
  onEdit,
  onDelete,
  onMarkStatus
}: InvoiceDetailsProps) {

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-full font-mono uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Paid</span>
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold rounded-full font-mono uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold rounded-full font-mono uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>Overdue</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/25 text-slate-400 text-xs font-bold rounded-full font-mono uppercase tracking-wide">
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop with translucent filter */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-[#0d1017] border-l border-slate-900 text-slate-100 h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
        {/* Header with dark tone context */}
        <div className="px-6 py-5 border-b border-slate-900 flex items-center justify-between bg-[#0a0c12]">
          <div className="flex items-center space-x-3.5">
            <h2 className="text-sm font-bold text-slate-300 font-mono tracking-wide">
              {invoice.invoiceNumber}
            </h2>
            {getStatusBadge(invoice.status)}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-500 hover:text-slate-300 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 space-y-7 overflow-y-auto">
          {/* Quick pending state message */}
          {invoice.status === "pending" && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start space-x-3 text-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold font-sans">Invoice Awaiting Settlement</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  This transaction is pending. Once payment has been wired, mark it as paid to register the revenue.
                </p>
              </div>
            </div>
          )}

          {/* Quick overdue alert message */}
          {invoice.status === "overdue" && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-start space-x-3 text-rose-200">
              <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold font-sans">Payment Overdue</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Crucial action required: This invoice&apos;s due date has elapsed and remained unpaid. Automatically flagged by our background cron scheduler.
                </p>
              </div>
            </div>
          )}

          {/* Core Info Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4.5 bg-[#121520]/60 border border-slate-900 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Billed From</span>
              <p className="text-xs font-bold text-white mt-1.5">Invoicely Consultant Group</p>
              <p className="text-[11px] text-slate-400 mt-1">billing@invoicely.app</p>
            </div>

            <div className="p-4.5 bg-[#121520]/60 border border-slate-900 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Billed To</span>
              <p className="text-xs font-bold text-white mt-1.5">{invoice.clientName}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5 font-mono">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate">{invoice.clientEmail}</span>
              </p>
            </div>
          </div>

          {/* Terms info */}
          <div className="bg-[#121520]/60 border border-slate-900 rounded-xl p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Issue Date</p>
              <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>{invoice.issueDate}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Due Date</p>
              <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>{invoice.dueDate}</span>
              </p>
            </div>
          </div>

          {/* Items breakdown list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Itemized Description</h3>
            <div className="border border-slate-900 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-900">
                <thead className="bg-[#0a0c12]/90">
                  <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th scope="col" className="px-4 py-3">Description</th>
                    <th scope="col" className="px-4 py-3 text-center">Qty</th>
                    <th scope="col" className="px-4 py-3 text-right">Price</th>
                    <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-[#0c0e16] divide-y divide-[#1b1f2b]/20 text-slate-300 text-xs font-semibold">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3.5 text-slate-200 max-w-[200px] truncate">{item.description}</td>
                      <td className="px-4 py-3.5 text-center text-slate-400 font-mono">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-slate-400 font-mono">₹ {item.price.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-white">
                        ₹ {(item.quantity * item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {/* Total summary rows */}
                  <tr className="bg-[#0a0c12]/60 border-t border-slate-900">
                    <td colSpan={2} />
                    <td className="px-4 py-3.5 text-right text-[10px] text-slate-500 font-mono uppercase font-bold">Grand Total</td>
                    <td className="px-4 py-3.5 text-right text-sm text-[#818cf8] font-bold font-mono">
                      ₹ {invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {invoice.notes && (
            <div className="border border-slate-900 rounded-xl p-4.5 bg-[#0b0c11]">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">Payment Notes / Terms</span>
              <p className="text-xs text-slate-400 leading-relaxed mt-2 italic">
                &quot;{invoice.notes}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Footer actions with dark styles */}
        <div className="p-6 border-t border-slate-900 bg-[#0a0c12] flex items-center justify-between">
          <button
            onClick={() => onDelete(invoice.id)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400 transition cursor-pointer"
          >
            <Trash className="h-4 w-4" />
            <span>Delete Invoice</span>
          </button>

          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => generateInvoicePDF(invoice)}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-semibold transition cursor-pointer font-sans"
              title="Export as a clean, custom-styled PDF"
            >
              <FileDown className="h-4 w-4" />
              <span>Export PDF</span>
            </button>

            {invoice.status !== "paid" && (
              <button
                onClick={() => onMarkStatus(invoice.id, "paid")}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white shadow-md shadow-emerald-600/10 transition cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark Settled</span>
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer font-sans"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
