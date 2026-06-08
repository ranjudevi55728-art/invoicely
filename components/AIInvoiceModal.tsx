'use client';

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  Sparkles, 
  Loader2, 
  Check, 
  AlertCircle, 
  Download, 
  ArrowRight, 
  FileText,
  Calendar,
  Layers,
  X,
  RefreshCw
} from 'lucide-react';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import confetti from 'canvas-confetti';

interface AIInvoiceModalProps {
  onClose: () => void;
  onSelectFill: (extractedData: any) => void;
}

interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  taxId: string;
  paymentDetails: string;
  taxSystem?: 'gst-exclusive' | 'gst-inclusive' | 'vat' | 'sales-tax';
}

export default function AIInvoiceModal({ onClose, onSelectFill }: AIInvoiceModalProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [directSaved, setDirectSaved] = useState(false);
  const [directSaving, setDirectSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Suggested Prompts
  const suggestedPrompts = [
    {
      title: "Consulting Gig",
      desc: "Web audit draft",
      text: "Create an invoice for Acme Corp, billing@acme.com. We conducted 1 Web Architecture Audit at 45000 and 5 hours of developer coaching at 3000/hr. Apply a 5% trade discount, tax rate is 18%, and make the due date June 20th. Keep status pending."
    },
    {
      title: "SaaS Subscription",
      desc: "Enterprise plan",
      text: "Generate an invoice for Jane Doe, jane.doe@comcast.net containing 1 Annual Pro Premium Plan service for 12000 INR and 1 Dedicated Onboarding Bootcamp session for 5000. Apply normal 18% GST and make it paid. Notes: 'Standard yearly tier access'."
    },
    {
      title: "Product Sale",
      desc: "Hardware supply",
      text: "Bill to TechCorp India (procurement@techcorp.in) for 2 high-performance developer workstations at 85,000 INR each. GST is 18%, issue date is today, due in 10 days. Status pending."
    }
  ];

  // Load company settings once for direct PDF generation matching
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const q = query(collection(db, 'settings'), where('userId', '==', user.uid), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sData = snap.docs[0].data();
          setCompanySettings({
            companyName: sData.companyName || '',
            companyEmail: sData.companyEmail || '',
            companyPhone: sData.companyPhone || '',
            companyAddress: sData.companyAddress || '',
            taxId: sData.taxId || '',
            paymentDetails: sData.paymentDetails || '',
            taxSystem: sData.taxSystem || 'gst-exclusive',
          });
        }
      } catch (err) {
        console.error("Error preloading settings for PDF: ", err);
      }
    };
    loadSettings();
  }, [user]);

  // Handle the multi-stage loading animation step triggers
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "Contacting Gemini Intelligent Parser...",
    "Extracting contact profiles & clients...",
    "Aligning calculated unit totals...",
    "Structuring database object schema..."
  ];

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setExtractedData(null);
    setDirectSaved(false);

    try {
      const response = await fetch('/api/gemini/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to analyze plain English descriptor.');
      }

      const parsedInvoice = await response.json();

      if (!parsedInvoice.customerName || !parsedInvoice.customerEmail) {
        throw new Error("Gemini was unable to extract clear customer details. Please expand your billing description.");
      }

      // Safeguard date values if missing
      if (!parsedInvoice.issueDate) {
        parsedInvoice.issueDate = new Date().toISOString().split('T')[0];
      }
      if (!parsedInvoice.dueDate) {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        parsedInvoice.dueDate = d.toISOString().split('T')[0];
      }

      // Safeguard items
      if (!parsedInvoice.items || !Array.isArray(parsedInvoice.items) || parsedInvoice.items.length === 0) {
        parsedInvoice.items = [{ name: 'Extracted Consulting Service', quantity: 1, rate: 10000 }];
      }

      setExtractedData(parsedInvoice);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An error occurred while contacting AI services.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSave = async () => {
    if (!user || !extractedData) return;
    setDirectSaving(true);
    setErrorMsg(null);

    // Run math calculation mirrors
    const subtotal = extractedData.items.reduce((sum: number, it: any) => sum + ((it.quantity || 1) * (it.rate || 0)), 0);
    const taxRate = typeof extractedData.taxRate === 'number' ? extractedData.taxRate : 18;
    const discountRate = typeof extractedData.discountRate === 'number' ? extractedData.discountRate : 0;
    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discountAmount;

    let taxAmount = 0;
    let total = 0;
    const activeTaxSystem = companySettings?.taxSystem || 'gst-exclusive';

    if (activeTaxSystem === 'gst-inclusive') {
      taxAmount = taxableAmount * (taxRate / (100 + taxRate));
      total = taxableAmount;
    } else {
      taxAmount = taxableAmount * (taxRate / 100);
      total = taxableAmount + taxAmount;
    }

    const payload = {
      invoiceNumber: extractedData.invoiceNumber || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: 'custom-client-entry',
      customerName: extractedData.customerName,
      customerEmail: extractedData.customerEmail,
      issueDate: extractedData.issueDate,
      dueDate: extractedData.dueDate,
      items: extractedData.items.map((it: any) => ({
        name: it.name,
        quantity: it.quantity || 1,
        rate: it.rate || 0,
        amount: (it.quantity || 1) * (it.rate || 0)
      })),
      subtotal,
      taxSystem: activeTaxSystem,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      status: extractedData.status || 'pending',
      notes: extractedData.notes || '',
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'invoices'), payload);
      
      setDirectSaved(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Directly trigger automatic jsPDF download!
      const docPdf = generateInvoicePDF({
        invoiceNumber: payload.invoiceNumber,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
        items: payload.items,
        subtotal: payload.subtotal,
        taxRate: payload.taxRate,
        taxAmount: payload.taxAmount,
        discountRate: payload.discountRate,
        discountAmount: payload.discountAmount,
        total: payload.total,
        status: payload.status,
        notes: payload.notes,
        companyName: companySettings?.companyName,
        companyEmail: companySettings?.companyEmail,
        companyAddress: companySettings?.companyAddress,
        companyPhone: companySettings?.companyPhone,
        taxId: companySettings?.taxId,
      });
      docPdf.save(`Invoice-${payload.invoiceNumber}.pdf`);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to directly save the document to Firestore DB. Check your rules permissions.");
    } finally {
      setDirectSaving(false);
    }
  };

  const loadIntoManualForm = () => {
    if (!extractedData) return;
    onSelectFill(extractedData);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4.5 h-4.5 fill-indigo-400/20" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              AI Intelligent Billing Engine
            </h4>
            <p className="text-[10px] text-slate-400">Powered by Gemini-3.5-Flash text parsing metrics.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-white text-sm bg-white/5 hover:bg-white/10 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer font-semibold"
        >
          &times;
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Prompt Input Form block */}
        <div className="lg:col-span-3 space-y-4">
          <form onSubmit={handleAISubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5 font-bold tracking-wider">Describe your invoice in plain English</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Create an invoice for Acme Corp, billing@acme.com. We delivered 1 Consultation for 50000 INR and 2 Graphic Layout designs for 10000 INR each. Apply a 18% GST, trade discount of 5%, and make it due in 15 days."
                className="w-full bg-white/3 border border-white/5 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 min-h-[140px] resize-y leading-relaxed"
                required
                disabled={loading}
              />
            </div>

            <div className="flex justify-between items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setExtractedData(null);
                  setErrorMsg(null);
                  setDirectSaved(false);
                }}
                disabled={loading || !prompt}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-white/2 hover:bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Description</span>
              </button>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{loading ? "Extracting..." : "Extract Billing Details &rarr;"}</span>
              </button>
            </div>
          </form>

          {/* Prompt Templates suggestions list */}
          <div className="space-y-2">
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-black">Interactive Quick Descriptions</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestedPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(item.text);
                    setErrorMsg(null);
                  }}
                  disabled={loading}
                  className="p-3 bg-[#111114] hover:bg-white/5 border border-white/2 hover:border-white/5 rounded-xl transition-all cursor-pointer text-left space-y-1 block max-h-[120px] overflow-hidden"
                >
                  <p className="text-[10px] font-bold text-slate-200">{item.title}</p>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                  <p className="text-[9px] text-slate-400 line-clamp-2 mt-1 leading-normal italic">"{item.text}"</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results / Extracted Status block */}
        <div className="lg:col-span-2 bg-[#111114]/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white transition-opacity">{loadingMessages[loadingStep]}</p>
                <p className="text-[10px] text-zinc-500 font-mono">Parsing JSON schema indices...</p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-xs font-bold text-rose-400">Extraction Error</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          ) : extractedData ? (
            <div className="flex-1 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4 overflow-y-auto max-h-[280px] pr-1">
                <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold py-1 px-2 rounded-full uppercase tracking-wider w-max">
                  <Check className="w-3.5 h-3.5 mr-1" /> Ready Compiled
                </div>

                {/* Recipient breakdown */}
                <div className="space-y-2 border-b border-white/5 pb-3">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase font-black">Recipient Contact</span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{extractedData.customerName}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{extractedData.customerEmail}</p>
                    {extractedData.companyName && <p className="text-[10px] text-indigo-400 mt-0.5 font-mono">🏢 {extractedData.companyName}</p>}
                  </div>
                </div>

                {/* Date / Metadata */}
                <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-3">
                  <div>
                    <span className="block text-[9px] font-mono text-slate-400 uppercase">Issue Date</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-200">{extractedData.issueDate}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono text-slate-400 uppercase">Due Date</span>
                    <span className="text-[11px] font-mono font-semibold text-pink-400">{extractedData.dueDate}</span>
                  </div>
                </div>

                {/* Parsed products */}
                <div className="space-y-2 border-b border-white/5 pb-3">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase font-black">Line Items</span>
                  <div className="space-y-1.5">
                    {extractedData.items.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between items-start text-[10px]">
                        <span className="text-slate-300 font-semibold max-w-[120px] line-clamp-1">{it.name}</span>
                        <span className="text-slate-400 font-mono">
                          {it.quantity} x {it.rate?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary estimates */}
                <div className="space-y-1 bg-white/2 rounded-xl p-2.5 text-[10px]">
                  <div className="flex justify-between text-slate-400">
                    <span>GST (taxRate):</span>
                    <span>{extractedData.taxRate || 18}%</span>
                  </div>
                  {extractedData.discountRate > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Discount (discountRate):</span>
                      <span className="text-emerald-400">-{extractedData.discountRate || 0}%</span>
                    </div>
                  )}
                  {extractedData.gstNumber && (
                    <div className="flex justify-between text-slate-400 font-mono text-[9px] border-t border-white/5 pt-1 mt-1">
                      <span>GSTIN:</span>
                      <span>{extractedData.gstNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons panel */}
              {directSaved ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-xl p-3 text-center space-y-2 font-semibold">
                  <Check className="w-5 h-5 mx-auto text-emerald-400 shrink-0" />
                  <p>Saved & PDF Downloaded!</p>
                  <button 
                    onClick={onClose}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1.5 px-3 rounded-lg font-bold uppercase transition-colors cursor-pointer"
                  >
                    Close AI Window
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <button
                    onClick={handleDirectSave}
                    disabled={directSaving}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {directSaving ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <Download className="w-4.5 h-4.5" />
                    )}
                    <span>{directSaving ? "Saving..." : "Direct Save & Download PDF"}</span>
                  </button>

                  <button
                    onClick={loadIntoManualForm}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <span>Load into Form & Edit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-400">Awaiting Extraction Details</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">Enter a description or try one of our interactive quick prompts on the left to extract full JSON properties.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
