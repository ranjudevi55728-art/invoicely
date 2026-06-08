'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Search, 
  Check, 
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
}

export default function CustomersPage() {
  return (
    <AuthGuard>
      <CustomersContent />
    </AuthGuard>
  );
}

function CustomersContent() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'customers'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Customer[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        docs.push({
          id: d.id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          company: data.company || '',
          address: data.address || '',
        });
      });
      setCustomers(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching customers: ', error);
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setModalError(null);

    if (!name || !email) {
      setModalError('Kindly enter both Customer Name and Billing Email Address.');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'customers'), {
        name,
        email,
        phone,
        company,
        address,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setAddress('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding customer: ', err);
      setModalError('Permission blocked or invalid customer schema.');
      handleFirestoreError(err, OperationType.WRITE, 'customers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Delete this customer profile from your directory?')) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      console.error('Error deleting customer: ', err);
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex bg-[#0A0A0C] text-slate-100 min-h-screen font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-20 border-b border-white/5 pl-18 pr-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight font-sans">Billing customer base</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Find customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-48 sm:w-64 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Profile</span>
            </button>
          </div>
        </header>

        {/* Content pane */}
        <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Manage critical credentials of corporate segments. The customer accounts will be integrated during invoice generations.</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Accessing customers records directory...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-[#111114] border border-white/5 rounded-3xl p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto shadow-xl">
              <div className="w-12 h-12 bg-white/2 rounded-full flex items-center justify-center text-slate-400"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-semibold text-white">Empty directory database</p>
                <p className="text-xs text-slate-500 mt-1">No billing customer profiles registered yet under your account.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-bold py-2 px-4 rounded-xl border border-indigo-600/20 transition-all cursor-pointer"
              >
                Register First Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((c) => (
                <motion.div 
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111114] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white tracking-tight">{c.name}</h4>
                      {c.company && (
                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-1 font-sans">
                          <Building className="w-3.5 h-3.5 font-sans" /> {c.company}
                        </p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteCustomer(c.id)}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <hr className="border-white/5 my-4" />

                  <div className="space-y-2.5 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed line-clamp-2">{c.address}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Trigger registration popup modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111114] border border-white/5 rounded-3xl w-full max-w-md p-6 overflow-hidden relative shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Register new client profile</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-500 hover:text-white rounded-full bg-white/2 hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Errors */}
              {modalError && (
                <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs mb-4">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleAddCustomer} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5">Client Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Admin Sales"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5">Billing Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="e.g. accounts@acmcorp.co"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5">Company Segment</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corp"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5">Phone line</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91 999 999 99"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5">Billing Street address details</label>
                  <textarea 
                    placeholder="Provide full tax and location street addresses"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-[#0A0A0C] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-transparent hover:bg-white/5 text-slate-300 rounded-xl border border-white/10 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Write profile</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
