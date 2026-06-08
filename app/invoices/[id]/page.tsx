'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, FileText, Calendar, Building, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

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

export default function DetailedInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <AuthGuard>
      <DetailedInvoiceContent invoiceId={resolvedParams.id} />
    </AuthGuard>
  );
}

function DetailedInvoiceContent({ invoiceId }: { invoiceId: string }) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInvoiceAndSettings = useCallback(async () => {
    if (!user || !invoiceId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch Invoice Details
      const invRef = doc(db, 'invoices', invoiceId);
      const invSnap = await getDoc(invRef);

      if (!invSnap.exists()) {
        setErrorMsg('Requested invoice invoice receipt does not exist in the ledger system.');
        setLoading(false);
        return;
      }

      const invData = invSnap.data();
      if (invData.userId !== user.uid) {
        setErrorMsg('Data protection enforcer: You are not authorized to view this document.');
        setLoading(false);
        return;
      }

      setInvoice({
        id: invSnap.id,
        invoiceNumber: invData.invoiceNumber,
        customerId: invData.customerId,
        customerName: invData.customerName,
        customerEmail: invData.customerEmail,
        issueDate: invData.issueDate,
        dueDate: invData.dueDate,
        items: invData.items || [],
        subtotal: invData.subtotal || 0,
        taxRate: invData.taxRate || 0,
        taxAmount: invData.taxAmount || 0,
        discountRate: invData.discountRate || 0,
        discountAmount: invData.discountAmount || 0,
        total: invData.total || 0,
        status: invData.status,
        taxSystem: invData.taxSystem,
        notes: invData.notes,
        userId: invData.userId,
      });

      // 2. Fetch Corporate Settings
      const qSettings = query(collection(db, 'settings'), where('userId', '==', user.uid));
      const settingsSnap = await getDocs(qSettings);
      if (!settingsSnap.empty) {
        const sData = settingsSnap.docs[0].data();
        setSettings({
          companyName: sData.companyName || '',
          companyEmail: sData.companyEmail || '',
          companyPhone: sData.companyPhone || '',
          companyAddress: sData.companyAddress || '',
          taxId: sData.taxId || '',
          paymentDetails: sData.paymentDetails || '',
          upiId: sData.upiId || '',
          upiName: sData.upiName || '',
        });
      }
    } catch (err) {
      console.error('Error fetching details: ', err);
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to fetch ledger from DB. Details: ${detail}`);
      handleFirestoreError(err, OperationType.GET, `invoices/${invoiceId}`);
    } finally {
      setLoading(false);
    }
  }, [user, invoiceId]);

  useEffect(() => {
    fetchInvoiceAndSettings();
  }, [fetchInvoiceAndSettings]);

  return (
    <div className="flex bg-[#0A0A0C] text-slate-100 min-h-screen font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-20 border-b border-white/5 pl-18 pr-4 sm:px-8 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-4">
            <Link 
              href="/invoices"
              className="p-2 bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer font-semibold flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <div className="h-5 w-px bg-white/5" />
            <h1 className="text-sm font-bold text-white tracking-widest uppercase font-mono">Invoice Details</h1>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">ENCRYPTED SSL SESSION</span>
        </header>

        <div className="flex-1 p-8 max-w-5xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Accessing invoice records details...</div>
          ) : errorMsg ? (
            <div className="bg-[#111114] border border-white/5 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white">Record unretrievable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
              <Link 
                href="/invoices"
                className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl mt-4 cursor-pointer"
              >
                Go to Ledger directories
              </Link>
            </div>
          ) : invoice ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <InvoiceTemplate 
                invoice={invoice} 
                settings={settings} 
                onStatusUpdated={fetchInvoiceAndSettings}
              />
            </motion.div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
