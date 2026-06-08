'use client';

import React, { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { Printer, FileText } from 'lucide-react';

interface ComponentProps {
  params: Promise<{ id: string }>;
}

export default function PublicInvoiceSharePage({ params }: ComponentProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [invoice, setInvoice] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState('');
  const [templateSelection, setTemplateSelection] = useState('modern');

  useEffect(() => {
    const fetchPublicInvoice = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'invoices', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setInvoice({ id: snap.id, ...data });
          setTemplateSelection(data.pdfTemplateId || 'modern');

          // Fetch issuer settings
          if (data.userId) {
            const settingsRef = doc(db, 'settings', data.userId);
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
              setSettings(settingsSnap.data());
            }
          }
        } else {
          setErrorHeader('Requested Tax Invoice document was not found or has expired.');
        }
      } catch (e: any) {
        console.error(e);
        setErrorHeader('Failed to load invoice: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Establishing secure sharing channel to invoice database...</p>
        </div>
      </div>
    );
  }

  if (errorHeader || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm space-y-3 shadow-lg">
          <FileText className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-extrabold text-slate-900 dark:text-white">Resource Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{errorHeader}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-4 md:p-12 transition-colors duration-200">
      
      {/* Printable Style overrides to hide screen layouts beautifully during Print command */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-printable-container, #invoice-printable-container * {
            visibility: visible;
          }
          #invoice-printable-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Floating control header */}
      <div className="print:hidden max-w-[21cm] mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest text-slate-400">Secure Client invoice portal</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Swaps template types */}
          <div className="flex items-center space-x-1 p-0.5 bg-slate-150 dark:bg-slate-800 rounded-lg">
            {['modern', 'classic', 'minimal', 'elegant'].map((tID) => (
              <button
                key={tID}
                onClick={() => setTemplateSelection(tID)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase transition-all ${
                  templateSelection === tID
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {tID}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download & Save PDF Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Sheet container */}
      <InvoiceTemplate invoice={invoice} settings={settings} customTemplateId={templateSelection} />
    </div>
  );
}
