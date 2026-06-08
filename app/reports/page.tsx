'use client';

import React, { useEffect, useState } from 'react';
import { WithAuth } from '@/components/WithAuth';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  BarChart3, 
  IndianRupee, 
  HelpCircle,  
  ArrowUpRight, 
  TrendingUp, 
  PieChart as LucidePieChart, 
  Sparkles, 
  Printer, 
  Percent,
  TrendingDown,
  Briefcase
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [custShare, setCustShare] = useState<any[]>([]);
  const [monthlyVols, setMonthlyVols] = useState<any[]>([]);

  const [topClient, setTopClient] = useState({ name: 'N/A', amount: 0 });
  
  const [sums, setSums] = useState({
    subtotal: 0,
    gst: 0,
    total: 0,
    unpaid: 0,
    paid: 0,
    overdue: 0
  });

  useEffect(() => {
    if (!user) return;

    const pullMetrics = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'invoices'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());
        setInvoices(data);

        // Run math aggregations
        let subVal = 0;
        let gstVal = 0;
        let totalVal = 0;
        let unpaidTotal = 0;
        let paidTotal = 0;
        let overdueTotal = 0;

        const customerAgg: { [key: string]: number } = {};
        const monthlyAgg: { [key: string]: { name: string; Billed: number; Tax: number } } = {};

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        data.forEach((inv: any) => {
          const invTotal = inv.totalAmount || 0;
          const invSub = inv.subtotal || 0;
          const invGst = inv.gstAmount || 0;

          subVal += invSub;
          gstVal += invGst;
          totalVal += invTotal;

          if (inv.status === 'Paid') {
            paidTotal += invTotal;
          } else if (inv.status === 'Sent') {
            unpaidTotal += invTotal;
          } else if (inv.status === 'Overdue') {
            overdueTotal += invTotal;
          }

          // Group by customer
          if (inv.customerName) {
            customerAgg[inv.customerName] = (customerAgg[inv.customerName] || 0) + invTotal;
          }

          // Group by month
          const dateObj = new Date(inv.date);
          if (!isNaN(dateObj.getTime())) {
            const key = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear().toString().substring(2)}`;
            if (!monthlyAgg[key]) {
              monthlyAgg[key] = { name: key, Billed: 0, Tax: 0 };
            }
            monthlyAgg[key].Billed += invTotal;
            monthlyAgg[key].Tax += invGst;
          }
        });

        setSums({
          subtotal: subVal,
          gst: gstVal,
          total: totalVal,
          paid: paidTotal,
          unpaid: unpaidTotal,
          overdue: overdueTotal
        });

        // Determine Top Client
        let maxClient = 'N/A';
        let maxVal = 0;
        Object.keys(customerAgg).forEach(k => {
          if (customerAgg[k] > maxVal) {
            maxVal = customerAgg[k];
            maxClient = k;
          }
        });
        setTopClient({ name: maxClient, amount: maxVal });

        // Build Customer allocation share
        const clientSharesList = Object.keys(customerAgg).map(name => ({
          name,
          value: parseFloat(customerAgg[name].toFixed(2))
        })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5
        setCustShare(clientSharesList);

        // Build sorted monthly volumes
        const monthsSorted = Object.values(monthlyAgg);
        setMonthlyVols(monthsSorted);

      } catch (err) {
        console.error("Reports aggregation err:", err);
      } finally {
        setLoading(false);
      }
    };

    pullMetrics();
  }, [user]);

  // Color arrays for allocations Pie Chart
  const COLORS = ['#3b82f6', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <WithAuth>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* Title bar */}
          <div className="pb-6 border-b border-slate-205 dark:border-slate-800 mb-8 pl-14 sm:pl-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-slate-500" />
              <span>Interactive Analytics Hub</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Comprehensive summaries of billing operations, sales revenue, taxes, and customer distributions.
            </p>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-400">Synthesizing financial reports...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
              <BarChart3 className="w-12 h-12 text-slate-350 mx-auto mb-4 animate-pulse" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Analytical charts require active invoice records.</p>
              <p className="text-xs text-slate-400 mt-1">Once you register invoices, charts will plot revenue flows automatically.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Key Metrics cards layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Gross Billing */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xs space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Total Gross Billing</span>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                    <IndianRupee className="w-5 h-5 mr-0.5 text-slate-400 shrink-0" />
                    {sums.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Includes GST and service bases</span>
                  </div>
                </div>

                {/* Top Client account */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xs space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">highest contributing client</span>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white truncate" title={topClient.name}>
                    {topClient.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold dark:text-slate-450">
                    Billed Total: ₹{(topClient.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>

                {/* Tax Split */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xs space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">CUMULATIVE TAX GST VALUE</span>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center">
                    <IndianRupee className="w-5 h-5 mr-0.5 text-slate-400 shrink-0" />
                    {sums.gst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center space-x-1 font-bold text-[11px] text-blue-600 dark:text-blue-400">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Avg standard 18% compliance rate</span>
                  </div>
                </div>
              </div>

              {/* Graphic charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Sales volume over months bar chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white">Monthly Sales Volume</h3>
                    <p className="text-xs text-slate-400">Aggregated payments and invoices issued relative to monthly schedules</p>
                  </div>
                  <div className="h-64 w-full">
                    {monthlyVols.length === 0 ? (
                      <div className="py-20 text-center text-xs text-slate-400">Awaiting monthly records calculations...</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyVols} margin={{ left: -20 }}>
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                          <YAxis stroke="#94A3B8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="opacity-30" />
                          <Bar dataKey="Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Billed Amount" />
                          <Bar dataKey="Tax" fill="#4f46e5" radius={[4, 4, 0, 0]} name="GST Collected" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Customer Shares Pie Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-205 dark:border-slate-850 shadow-2xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white">Customer Volume Diversification</h3>
                    <p className="text-xs text-slate-400">Sales value allocations across top invoice customers</p>
                  </div>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-between">
                    <div className="h-44 w-full sm:w-1/2">
                      {custShare.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">Awaiting customer share data...</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={custShare}
                              cx="55%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={1}
                              dataKey="value"
                            >
                              {custShare.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="space-y-2 mt-4 sm:mt-0 max-w-[220px] text-xs">
                      {custShare.map((client, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="truncate text-slate-600 dark:text-slate-300 font-medium" title={client.name}>{client.name}:</span>
                          <span className="font-bold font-mono">₹{client.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: Operational payments analytics split */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xs">
                <h3 className="font-bold text-slate-950 dark:text-white pb-3 border-b border-slate-50 dark:border-slate-800 mb-6">Payment Collection Efficiency</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm font-semibold">
                  
                  <div className="p-4 bg-green-50/40 dark:bg-green-950/15 rounded-xl border border-green-100 dark:border-green-900/30">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Processed Income Receipts</p>
                    <p className="text-xl font-black text-green-700 dark:text-green-400">₹{sums.paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-slate-450 mt-1.5 text-slate-400">100% full cleared funds</p>
                  </div>

                  <div className="p-4 bg-blue-50/45 dark:bg-blue-950/15 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Outstanding Pending</p>
                    <p className="text-xl font-black text-blue-650 dark:text-blue-400">₹{sums.unpaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-slate-450 mt-1.5 text-slate-400">Active invoices awaiting collection</p>
                  </div>

                  <div className="p-4 bg-red-50/35 dark:bg-red-950/15 rounded-xl border border-red-100 dark:border-red-900/30">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Overdue Outstanding</p>
                    <p className="text-xl font-black text-red-650 dark:text-red-400 text-red-600">₹{sums.overdue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs mt-1.5 text-red-500 dark:text-red-400 font-bold flex items-center justify-center space-x-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Action required: send reminders</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </WithAuth>
  );
}
