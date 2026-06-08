'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Filter, 
  Download, 
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceForm from '@/components/InvoiceForm';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
}

export default function InvoicesPage() {
  return (
    <AuthGuard>
      <InvoicesContent />
    </AuthGuard>
  );
}

function InvoicesContent() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Ordered by invoiceNumber desc to get latest first
    const q = query(
      collection(db, 'invoices'),
      where('userId', '==', user.uid),
      orderBy('invoiceNumber', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Invoice[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        docs.push({
          id: d.id,
          invoiceNumber: data.invoiceNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          total: data.total,
          status: data.status,
        });
      });
      setInvoices(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching invoices: ', error);
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Delete this invoice permanently?')) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
    } catch (err) {
      console.error('Error deleting invoice: ', err);
      handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, newStatus: 'draft' | 'pending' | 'paid' | 'overdue') => {
    setUpdatingInvoiceId(id);
    try {
      const docRef = doc(db, 'invoices', id);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating invoice status: ', err);
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex bg-[#0A0A0C] text-slate-100 min-h-screen font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-20 border-b border-white/5 pl-18 pr-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Invoice directory ledger</h1>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </header>

        {/* Content viewport */}
        <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Filtering bar section */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111114] border border-white/5 p-4 rounded-2xl">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search invoice label..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {['all', 'draft', 'pending', 'paid', 'overdue'].map((status) => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                    statusFilter === status 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white/2 hover:bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table list */}
          <div className="bg-[#111114] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Querying invoices ledger...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                <FileText className="w-12 h-12 text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-white">No invoice records found</p>
                  <p className="text-xs text-slate-500 mt-1">No reports matching status &quot;{statusFilter}&quot; or search exists.</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="px-4 py-2 bg-white/2 hover:bg-white/5 border border-white/5 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-mono border-b border-white/5 bg-white/2">
                      <th className="px-6 py-4 font-semibold">Invoice ID</th>
                      <th className="px-6 py-4 font-semibold">Customer Segment Details</th>
                      <th className="px-6 py-4 font-semibold">Bill Date</th>
                      <th className="px-6 py-4 font-semibold">Settlement due</th>
                      <th className="px-6 py-4 font-semibold text-right">Sum total amount</th>
                      <th className="px-6 py-4 font-semibold">Settlement Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-white/5">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/2 transition-all">
                        <td className="px-6 py-4 font-mono font-extrabold text-white">#{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-white">{inv.customerName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{inv.customerEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono">{inv.issueDate}</td>
                        <td className="px-6 py-4 text-slate-400 font-mono">{inv.dueDate}</td>
                        <td className="px-6 py-4 text-right font-bold text-white font-mono">
                          ₹ {inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={inv.status}
                            disabled={updatingInvoiceId === inv.id}
                            onChange={(e) => handleUpdateStatus(inv.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wide border bg-[#18181C] hover:bg-white/5 transition-all text-center focus:outline-none focus:border-indigo-500 cursor-pointer ${
                              inv.status === 'paid' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                              inv.status === 'pending' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                              inv.status === 'overdue' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
                              'text-slate-400 border-white/10 bg-white/2'
                            }`}
                          >
                            <option value="draft" className="bg-[#111114]">Draft</option>
                            <option value="pending" className="bg-[#111114]">Pending</option>
                            <option value="paid" className="bg-[#111114]">Paid</option>
                            <option value="overdue" className="bg-[#111114]">Overdue</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <a 
                              href={`/invoices/${inv.id}`}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
                            >
                              Open Details
                            </a>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete invoice record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Launcher create modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111114] border border-white/5 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Generate real premium invoice</h3>
                    <p className="text-[10px] text-slate-500">Draft values are parsed safely with transactional calculations.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                <InvoiceForm onClose={() => setShowCreateModal(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
