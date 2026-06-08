'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WithAuth } from '@/components/WithAuth';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { 
  FileText, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  Users, 
  Percent,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  
  // States of lists & statistics
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalDraft: 0,
    totalSent: 0,
    totalPaid: 0,
    totalOverdue: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0
  });

  // Query real database records
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch user profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        } else {
          const settingsRef = doc(db, 'settings', user.uid);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            setProfile(settingsSnap.data());
          }
        }

        // Fetch user customers count
        const customQ = query(collection(db, 'customers'), where('userId', '==', user.uid));
        const customSnap = await getDocs(customQ);
        setCustomersCount(customSnap.docs.length);

        // Fetch user invoices
        const invoiceQ = query(
          collection(db, 'invoices'), 
          where('userId', '==', user.uid)
        );
        const invoiceSnap = await getDocs(invoiceQ);
        const invoiceData = invoiceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Sort descending by date locally
        const sortedInvoices = [...invoiceData].sort((a: any, b: any) => new Date(b.issueDate || b.date || 0).getTime() - new Date(a.issueDate || a.date || 0).getTime());
        setInvoices(sortedInvoices);

        // Calculate statistics
        let drafts = 0;
        let sents = 0;
        let paids = 0;
        let overdues = 0;
        let paidVal = 0;
        let outVal = 0;
        let overdueVal = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        invoiceData.forEach((inv: any) => {
          const total = inv.totalAmount || 0;
          
          // Sum custom GST calculations
          if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach((item: any) => {
              if (inv.gstType === 'CGST_SGST') {
                cgst += parseFloat(item.cgst) || 0;
                sgst += parseFloat(item.sgst) || 0;
              } else if (inv.gstType === 'IGST') {
                igst += parseFloat(item.igst) || 0;
              }
            });
          }

          if (inv.status === 'Draft') {
            drafts++;
          } else if (inv.status === 'Sent') {
            sents++;
            outVal += total;
          } else if (inv.status === 'Paid') {
            paids++;
            paidVal += total;
          } else if (inv.status === 'Overdue') {
            overdues++;
            overdueVal += total;
          }
        });

        setStats({
          totalDraft: drafts,
          totalSent: sents,
          totalPaid: paids,
          totalOverdue: overdues,
          paidAmount: paidVal,
          outstandingAmount: outVal,
          overdueAmount: overdueVal,
          cgstTotal: cgst,
          sgstTotal: sgst,
          igstTotal: igst
        });

      } catch (e) {
        console.error("Error reading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Construct chart mock trend line based on authentic records inside Firestore (or fill gaps dynamically)
  const getMonthlyTrendData = () => {
    // Collect last 6 calendar months
    const trendMap: { [key: string]: { name: string; Received: number; Pending: number } } = {};
    
    // Seed standard labels
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const current = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      trendMap[label] = { name: label, Received: 0, Pending: 0 };
    }

    invoices.forEach((inv: any) => {
      const invDate = new Date(inv.date);
      const label = `${monthNames[invDate.getMonth()]} ${invDate.getFullYear().toString().substring(2)}`;
      if (trendMap[label]) {
        if (inv.status === 'Paid') {
          trendMap[label].Received += inv.totalAmount || 0;
        } else if (inv.status === 'Sent' || inv.status === 'Overdue') {
          trendMap[label].Pending += inv.totalAmount || 0;
        }
      }
    });

    return Object.values(trendMap);
  };

  const chartData = getMonthlyTrendData();

  return (
    <WithAuth>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        
        {/* Sidebar Panel Left */}
        <Sidebar />

        {/* Dashboard Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4 mb-8 pl-14 sm:pl-0">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Welcome back, {profile?.companyName || 'Business Owner'}
                </h1>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Interactive Hub</span>
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                Overview of your company tax invoices, transactions, and client catalog details.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/invoices/new"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all hover:scale-[1.01] shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create GST Invoice</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-400">Loading metrics dashboard...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Metric Bento Cards Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Outstanding card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Collections</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                      <IndianRupee className="w-5 h-5 inline mr-0.5 shrink-0" />
                      {stats.outstandingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{stats.totalSent} unpaid invoices outstanding</p>
                  </div>
                </div>

                {/* Received card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collected Revenue</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                      <IndianRupee className="w-5 h-5 inline mr-0.5 shrink-0" />
                      {stats.paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{stats.totalPaid} completed payment cycles</p>
                  </div>
                </div>

                {/* Overdue card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overdue Values</span>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                      <IndianRupee className="w-5 h-5 inline mr-0.5 shrink-0" />
                      {stats.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 font-semibold">{stats.totalOverdue} invoices past payment boundary</p>
                  </div>
                </div>

                {/* Stats summary of GST */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">GST Collected</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Percent className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                      <IndianRupee className="w-5 h-5 inline mr-0.5 shrink-0" />
                      {((stats.cgstTotal + stats.sgstTotal + stats.igstTotal)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">₹{(stats.cgstTotal + stats.sgstTotal).toFixed(0)} CGST+SGST | ₹{stats.igstTotal.toFixed(0)} IGST</p>
                  </div>
                </div>
              </div>

              {/* Graphical Trend Analyses & Quick Links */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main chart Area */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-white">Revenue Flow Trend</h3>
                      <p className="text-xs text-slate-400">Monthly breakdown of collection vs unresolved accounts (last 6 months)</p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-bold">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
                        <span>Collected</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 bg-amber-400 rounded-sm"></div>
                        <span>Pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="opacity-40" />
                        <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                        <YAxis fontSize={11} stroke="#94A3B8" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1E293B', 
                            borderRadius: '12px', 
                            border: 'none', 
                            color: '#F8FAFC',
                            fontSize: '12px' 
                          }} 
                        />
                        <Area type="monotone" dataKey="Received" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRec)" />
                        <Area type="monotone" dataKey="Pending" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPen)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right quick analytics stats counts */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
                  <h3 className="font-bold text-slate-950 dark:text-white">Workspace Overview</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-xs text-slate-400 block font-medium">Billed Customers</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">Active records</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-slate-950 dark:text-white">{customersCount}</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <p className="text-xs text-slate-400 block font-medium">Draft Slips</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">In progress edits</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-slate-950 dark:text-white">{stats.totalDraft}</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-xs text-slate-400 block font-medium">Total Invoices</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">Generated count</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-slate-950 dark:text-white">{invoices.length}</span>
                    </div>
                  </div>

                  <Link
                    href="/reports"
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1"
                  >
                    <span>Analyze Comprehensive Reports</span>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Recent Invoices table view */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white">Recent Tax Invoices</h3>
                    <p className="text-xs text-slate-400">Newly generated business transactions tracking log</p>
                  </div>
                  <Link 
                    href="/invoices" 
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5"
                  >
                    <span>View All Invoices</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <p className="text-sm">No tax invoices generated yet.</p>
                    <Link href="/invoices/new" className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold">
                      Create your very first invoice now
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="py-3 px-6">Invoice ID</th>
                          <th className="py-3 px-6">Customer</th>
                          <th className="py-3 px-6">Due Date</th>
                          <th className="py-3 px-6">Status</th>
                          <th className="py-3 px-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.slice(0, 5).map((inv: any) => (
                          <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                              <Link href={`/invoices/${inv.id}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                                {inv.invoiceNumber || `#${inv.id.substring(0, 6)}`}
                              </Link>
                            </td>
                            <td className="py-4 px-6 font-semibold dark:text-white">{inv.customerName || 'Anonymous Client'}</td>
                            <td className="py-4 px-6 text-slate-400 text-xs">
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                inv.status === 'Paid' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                                  : inv.status === 'Sent' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                                    : inv.status === 'Overdue' 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-black dark:text-white">
                              ₹{(inv.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </WithAuth>
  );
}
