"use client";

import React from "react";
import { Invoice, InvoiceStatus } from "../lib/types";
import { X, Calendar, Mail, FileText, Download, CheckCircle2 } from "lucide-react";
import { generateInvoicePDF } from "../lib/pdf-generator";
import { motion } from "motion/react";

interface InvoicePreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoicePreviewModal({ invoice, onClose }: InvoicePreviewModalProps) {
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Paid</span>
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-md font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-md font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>Overdue</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-bold rounded-md font-mono uppercase tracking-wider">
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        id="preview-backdrop"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-lg bg-[#0d1017] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        id="preview-modal"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-900 bg-[#0a0c12] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <FileText className="h-4 w-4" />
            </span>
            <div className="text-left">
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider">QUICK PREVIEW</h3>
              <p className="text-sm font-bold text-white mt-0.5">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            {getStatusBadge(invoice.status)}
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-500 hover:text-slate-300 transition cursor-pointer"
              id="close-preview-button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Core Info Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-left">
          {/* Client summary Card */}
          <div className="p-4 bg-[#121520]/75 border border-slate-900 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Recipient</span>
            <h4 className="text-sm font-bold text-white mt-1">{invoice.clientName}</h4>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5 font-mono">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              <span>{invoice.clientEmail}</span>
            </p>
          </div>

          {/* Issue / Due Dates Bar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#0d1017] border border-slate-900 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Issued On</span>
              <span className="text-xs font-semibold text-slate-300 mt-1 inline-flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{invoice.issueDate}</span>
              </span>
            </div>
            
            <div className="p-3 bg-[#0d1017] border border-slate-900 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Due Date</span>
              <span className="text-xs font-semibold text-slate-300 mt-1 inline-flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span className={invoice.status === "overdue" ? "text-rose-400 font-bold" : ""}>{invoice.dueDate}</span>
              </span>
            </div>
          </div>

          {/* Simplified Interactive Line Items Details */}
          <div className="space-y-2">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Itemized Breakdown ({invoice.items.length})</h4>
            <div className="border border-slate-900 rounded-xl overflow-hidden bg-[#090b0f]">
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-850">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-[#121520]/20">
                    <div className="flex-1 min-w-0 pr-3 text-left">
                      <p className="font-semibold text-slate-200 truncate">{item.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {item.quantity} x ₹ {item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-300 text-right">
                      ₹ {(item.quantity * item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Grand summary sticky row */}
              <div className="p-3 bg-[#0a0c12]/80 border-t border-slate-900 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Invoice Sum</span>
                <span className="text-indigo-400 text-sm">
                  ₹ {invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-3.5 bg-slate-900/40 border border-slate-900/60 rounded-xl text-[11px] text-slate-400 italic">
              &ldquo;{invoice.notes}&rdquo;
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-900 bg-[#0a0c12] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-905 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition font-sans"
            id="preview-close-footer"
          >
            Dimiss
          </button>
          
          <button
            onClick={() => generateInvoicePDF(invoice)}
            className="flex items-center space-x-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/10 cursor-pointer font-sans"
            id="preview-download-pdf"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Generate PDF</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
