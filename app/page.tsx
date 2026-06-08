"use client";

import React, { useState, useEffect } from "react";
import { Invoice, InvoiceStatus, DashboardStats } from "../lib/types";
import { 
  DEFAULT_INVOICES, 
  processOverdueInvoices, 
  calculateDashboardStats, 
  formatDateString 
} from "../lib/invoice-helper";
import Sidebar from "../components/Sidebar";
import InvoiceStats from "../components/InvoiceStats";
import SalesChart from "../components/SalesChart";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceDetails from "../components/InvoiceDetails";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import { AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  AlertTriangle,
  Mail,
  User,
  Settings as SettingsIcon,
  CheckCircle,
  Database,
  Users,
  Briefcase,
  DollarSign,
  Eye
} from "lucide-react";

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentTab, setCurrentTab] = useState("dashboard"); // "dashboard" | "invoices" | "customers" | "settings"
  const [flaggedLog, setFlaggedLog] = useState<string[]>([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "invoiceNumber">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection states for drawers
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Settings mock states
  const [autoCron, setAutoCron] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(true);

  // Load and check overdue on load
  useEffect(() => {
    const rawInvoices = localStorage.getItem("invoicely_invoices");
    let initialList: Invoice[] = [];

    if (rawInvoices) {
      try {
        initialList = JSON.parse(rawInvoices);
      } catch (e) {
        initialList = [...DEFAULT_INVOICES];
      }
    } else {
      initialList = [...DEFAULT_INVOICES];
    }

    // Process overdue automatic transition
    const { updatedInvoices, flaggedInvoices } = processOverdueInvoices(initialList);
    
    // Save to local storage
    localStorage.setItem("invoicely_invoices", JSON.stringify(updatedInvoices));
    setInvoices(updatedInvoices);
    
    if (flaggedInvoices.length > 0) {
      setFlaggedLog(flaggedInvoices);
    }
  }, []);

  // Recalculate stats dynamically
  const stats = calculateDashboardStats(invoices);

  // Search, filter, and sort combined
  const processedInvoices = invoices
    .filter((inv) => {
      const matchSearch = 
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "amount") {
        return (a.amount - b.amount) * multiplier;
      }
      if (sortBy === "invoiceNumber") {
        return a.invoiceNumber.localeCompare(b.invoiceNumber) * multiplier;
      }
      return a.dueDate.localeCompare(b.dueDate) * multiplier;
    });

  // Unique customers aggregate loaded from invoices
  const dynamicCustomers = React.useMemo(() => {
    const custMap = new Map<string, { email: string; count: number; totalPaid: number }>();
    invoices.forEach(inv => {
      const entry = custMap.get(inv.clientName) || { email: inv.clientEmail, count: 0, totalPaid: 0 };
      entry.count += 1;
      if (inv.status === "paid") {
        entry.totalPaid += inv.amount;
      }
      custMap.set(inv.clientName, entry);
    });
    return Array.from(custMap.entries()).map(([name, data]) => ({
      name,
      email: data.email,
      invoiceCount: data.count,
      totalPaid: data.totalPaid
    }));
  }, [invoices]);

  // Handle addition or updates
  const handleSaveInvoice = (invoiceData: Omit<Invoice, "id" | "amount"> & { id?: string }) => {
    const totalAmount = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    let updatedList: Invoice[] = [];

    if (invoiceData.id) {
      updatedList = invoices.map((inv) => {
        if (inv.id === invoiceData.id) {
          return {
            ...inv,
            ...invoiceData,
            amount: totalAmount
          } as Invoice;
        }
        return inv;
      });
      
      if (selectedInvoice && selectedInvoice.id === invoiceData.id) {
        setSelectedInvoice({
          ...selectedInvoice,
          ...invoiceData,
          amount: totalAmount
        } as Invoice);
      }
    } else {
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        status: invoiceData.status,
        items: invoiceData.items,
        notes: invoiceData.notes,
        amount: totalAmount
      };
      updatedList = [newInvoice, ...invoices];
    }

    const { updatedInvoices } = processOverdueInvoices(updatedList);
    localStorage.setItem("invoicely_invoices", JSON.stringify(updatedInvoices));
    setInvoices(updatedInvoices);
    setIsFormOpen(false);
    setIsEditing(false);
  };

  const handleDeleteInvoice = (id: string) => {
    const updated = invoices.filter((inv) => inv.id !== id);
    localStorage.setItem("invoicely_invoices", JSON.stringify(updated));
    setInvoices(updated);
    setSelectedInvoice(null);
  };

  const handleMarkStatus = (id: string, status: InvoiceStatus) => {
    const updated = invoices.map((inv) => {
      if (inv.id === id) {
        return { ...inv, status };
      }
      return inv;
    });
    localStorage.setItem("invoicely_invoices", JSON.stringify(updated));
    setInvoices(updated);
    
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({
        ...selectedInvoice,
        status
      });
    }
  };

  const handleResetSeedData = () => {
    localStorage.setItem("invoicely_invoices", JSON.stringify(DEFAULT_INVOICES));
    const { updatedInvoices, flaggedInvoices } = processOverdueInvoices(DEFAULT_INVOICES);
    localStorage.setItem("invoicely_invoices", JSON.stringify(updatedInvoices));
    setInvoices(updatedInvoices);
    if (flaggedInvoices.length > 0) {
      setFlaggedLog(flaggedInvoices);
    } else {
      setFlaggedLog([]);
    }
    setSelectedInvoice(null);
  };

  const toggleSort = (field: "dueDate" | "amount" | "invoiceNumber") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getStatusStyle = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/15";
      case "overdue":
        return "bg-rose-500/10 text-rose-400 border-rose-500/15";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/15";
    }
  };

  return (
    <div className="flex bg-[#090b0f] min-h-screen text-slate-100 font-sans">
      {/* LEFT SIDEBAR Navigation Panel */}
      <Sidebar 
        currentTab={currentTab} 
        onChangeTab={(tab) => {
          setCurrentTab(tab);
          // Auto clear filter if searching
          setSearchQuery("");
        }} 
        onResetSeedData={handleResetSeedData}
        flaggedLog={flaggedLog}
      />

      {/* CORE FRAME CONTENT CONTAINER */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Dynamic header logs & controls exactly matching screenshot */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-4.5 border-b border-slate-900">
          <div className="flex items-center space-x-3.5">
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              {currentTab === "dashboard" ? "Overview Dashboard" : 
               currentTab === "invoices" ? "Invoices Ledger Registry" :
               currentTab === "customers" ? "Client Directory Hub" : "Account Settings Workspace"}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
              LIVE DATABASE
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Search Input inline with Header */}
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0e111a] border border-slate-900 hover:border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                placeholder="Find invoice... (e.g. #INV)"
              />
            </div>

            {/* Quick launch creation button matching screenshot theme */}
            <button
              onClick={() => {
                setIsEditing(false);
                setIsFormOpen(true);
              }}
              className="flex items-center space-x-2 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/15 cursor-pointer font-sans"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Invoice</span>
            </button>
          </div>
        </header>

        {/* Dynamic Overdue Auto-Cron Warn Banner */}
        {flaggedLog.length > 0 && (
          <div className="mb-8 p-4.5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start space-x-3.5 shadow-sm">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-200 font-sans">Background Invoice Verification Complete</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Overdue cron verification scanned collection registers. Found <strong className="font-mono text-amber-300 font-bold">{flaggedLog.length}</strong> invoice (
                {flaggedLog.join(", ")}) containing overdue structures. Mutated status automatically from <span className="font-semibold text-slate-300">pending</span> to <span className="font-semibold text-rose-400 font-mono text-[10px] bg-rose-500/10 border border-rose-500/20 px-1 rounded">overdue</span>.
              </p>
            </div>
            <button 
              onClick={() => setFlaggedLog([])}
              className="text-amber-400 hover:text-amber-300 text-[10px] font-bold px-2.5 py-1 bg-amber-500/10 rounded-lg transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: MAIN OVERVIEW DASHBOARD ROUTE */}
        {currentTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Welcome Card matching screenshot */}
            <div className="bg-gradient-to-r from-[#17162b] via-[#10121e] to-[#0d1017] border border-[#1b1f2b]/65 rounded-3xl p-6.5 flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden">
              {/* Radial gradient background accent for glowing feel */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-xl">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2 font-sans">
                  <span>Good day, Ranju!</span>
                  <span className="text-[#818cf8] animate-pulse">✨</span>
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed font-sans">
                  Keep track of your invoices, customer profiles, and product pricing in real time.
                </p>
              </div>
              
              <div className="flex items-center space-x-3.5 mt-5 md:mt-0">
                <div className="bg-[#090b0f] border border-[#1b1f2b]/60 rounded-2xl p-4 min-w-[110px] text-center shadow-inner">
                  <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">INVOICE COUNT</p>
                  <p className="text-2xl font-black text-white mt-1.5 font-sans">{invoices.length}</p>
                </div>
                <div className="bg-[#090b0f] border border-[#1b1f2b]/60 rounded-2xl p-4 min-w-[110px] text-center shadow-inner">
                  <p className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">COMPLETED</p>
                  <p className="text-2xl font-black text-white mt-1.5 font-sans">
                    {invoices.filter(inv => inv.status === "paid").length}
                  </p>
                </div>
              </div>
            </div>

            {/* STATS MATRIX SECTION (Three KPI blocks matching image) */}
            <InvoiceStats stats={stats} />

            {/* CORE CHART & LAUNCHER GRID (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Income trend chart (Col-span-2) */}
              <div className="lg:col-span-2">
                <SalesChart invoices={invoices} />
              </div>

              {/* Quick Action launcher matching picture exactly */}
              <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-slate-900 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Quick invoice launcher</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 font-medium leading-relaxed">
                    Initiate a bill directly. The client profiles and registered price indices will automatically compile your inputs.
                  </p>

                  <div className="mt-6 space-y-3">
                    {/* Start Blank Invoice Action */}
                    <div 
                      onClick={() => {
                        setIsEditing(false);
                        setIsFormOpen(true);
                      }}
                      className="p-3.5 bg-[#080a10]/50 hover:bg-[#111421] border border-slate-900/80 hover:border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2.5 bg-[#141824] group-hover:bg-[#1d2335] text-indigo-400 rounded-xl transition">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-200">Start Blank Invoice</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Draft on custom details</p>
                        </div>
                      </div>
                      <span className="text-slate-500 group-hover:text-slate-200 transition text-sm">→</span>
                    </div>

                    {/* New Client profile trigger */}
                    <div 
                      onClick={() => {
                        setIsEditing(false);
                        setIsFormOpen(true);
                      }}
                      className="p-3.5 bg-[#080a10]/50 hover:bg-[#111421] border border-slate-900/80 hover:border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2.5 bg-[#141824] group-hover:bg-[#1d2335] text-emerald-400 rounded-xl transition font-mono font-bold text-xs h-9 w-9 flex items-center justify-center">
                          C
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-200">New Client profile</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Add key address indexes</p>
                        </div>
                      </div>
                      <span className="text-slate-500 group-hover:text-slate-200 transition text-sm">↗</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-900">
                  <button
                    onClick={() => setCurrentTab("invoices")}
                    className="w-full text-center text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition py-1"
                  >
                    View All Transaction Ledgers
                  </button>
                </div>
              </div>
            </div>

            {/* RECENT INVOICES SECTION */}
            <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6.5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <div className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Recent Activity Ledger</h4>
                </div>
                <button
                  onClick={() => setCurrentTab("invoices")}
                  className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold font-mono transition inline-flex items-center space-x-1"
                >
                  <span>View All Registry</span>
                  <span className="text-[12px]">→</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900">
                  <thead className="bg-[#0a0c12]/40">
                    <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <th scope="col" className="px-4 py-3">Invoice No</th>
                      <th scope="col" className="px-4 py-3">Client</th>
                      <th scope="col" className="px-4 py-3 text-right">Amount</th>
                      <th scope="col" className="px-4 py-3 text-center">Status</th>
                      <th scope="col" className="px-4 py-3 text-right">Quick View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1f2b]/20 text-slate-300 text-xs font-semibold">
                    {invoices.slice(0, 5).map((inv) => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:bg-[#141822]/60 cursor-pointer transition duration-150"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#818cf8]">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-white">{inv.clientName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{inv.clientEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white">
                          ₹ {inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-full font-mono uppercase tracking-wider border ${getStatusStyle(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right flex-row justify-end flex">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewInvoice(inv);
                            }}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#121520] border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-400 rounded-lg text-[10px] font-bold transition font-mono cursor-pointer"
                            id={`dashboard-preview-btn-${inv.id}`}
                            title="Quick preview"
                          >
                            <Eye className="h-3 w-3 text-indigo-400" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-sans">
                          No active billing indices located.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES REGISTRY TABLE VIEW */}
        {currentTab === "invoices" && (
          <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            {/* Table Control Bar */}
            <div className="p-6 border-b border-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a0c12]/40">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                
                {/* Embedded searching within table tab */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#090b0f] border border-slate-800 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-100"
                    placeholder="Search client, email, or invoice number..."
                  />
                </div>

                {/* Filter states */}
                <div className="flex items-center space-x-2 bg-[#090b0f] border border-slate-800 rounded-xl px-3 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-400 border-none outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="all" className="bg-[#0d1017]">All Status</option>
                    <option value="paid" className="bg-[#0d1017]">Paid</option>
                    <option value="pending" className="bg-[#0d1017]">Pending</option>
                    <option value="overdue" className="bg-[#0d1017]">Overdue</option>
                    <option value="draft" className="bg-[#0d1017]">Draft</option>
                  </select>
                </div>
              </div>

              {/* Inline layout trigger */}
              <button
                onClick={() => {
                  setIsEditing(false);
                  setIsFormOpen(true);
                }}
                className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Invoice</span>
              </button>
            </div>

            {/* Invoices List Table structured in high-contrast dark style */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-900">
                <thead className="bg-[#0a0c12]/80">
                  <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-900/60 transition" onClick={() => toggleSort("invoiceNumber")}>
                      <div className="flex items-center space-x-1.5">
                        <span>Invoice No</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-slate-500">Client</th>
                    <th scope="col" className="px-6 py-4 text-slate-500">Issue Date</th>
                    <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-900/60 transition font-mono" onClick={() => toggleSort("dueDate")}>
                      <div className="flex items-center space-x-1.5">
                        <span>Due Date</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-900/60 transition text-right" onClick={() => toggleSort("amount")}>
                      <div className="flex items-center space-x-1.5 justify-end">
                        <span>Amount</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-slate-500">Status</th>
                    <th scope="col" className="px-6 py-4 text-right text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#0d1017] divide-y divide-[#1b1f2b]/30 text-slate-300 text-xs font-semibold">
                  {processedInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-[#141822]/80 cursor-pointer transition duration-150"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-[#818cf8]">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-white">{inv.clientName}</p>
                        <p className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">{inv.clientEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{inv.issueDate}</td>
                      <td className="px-6 py-4 text-slate-400">{inv.dueDate}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-white">
                        ₹ {inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono uppercase tracking-wider border ${getStatusStyle(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewInvoice(inv);
                          }}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-400 rounded-lg text-[10px] font-bold transition font-mono cursor-pointer"
                          id={`preview-btn-${inv.id}`}
                          title="Quick preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {processedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-sans">
                        No active invoices matched search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CLIENT DIRECTORY HUB */}
        {currentTab === "customers" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-2">Registered Customer Demographics</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct indices of distinct clients tracked compiled from current active transaction registers with cumulative billing values.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dynamicCustomers.map((customer, idx) => (
                <div key={idx} className="bg-[#0b0c11] border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Styled Avatar */}
                    <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm">
                      {customer.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{customer.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">{customer.email}</p>
                      <span className="inline-flex mt-2 text-[9px] text-slate-400 font-mono bg-[#111422] px-2 py-0.5 rounded border border-slate-800">
                        {customer.invoiceCount} invoices registered
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Settle index</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-1">₹ {customer.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setIsFormOpen(true);
                      }}
                      className="mt-3.5 inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-lg transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Issue Bill</span>
                    </button>
                  </div>
                </div>
              ))}

              {dynamicCustomers.length === 0 && (
                <div className="col-span-2 text-center p-12 bg-[#0d1017] border border-slate-900 rounded-2xl text-slate-500">
                  No active client profile indexes compiled at this node yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT SETTINGS WORKSPACE */}
        {currentTab === "settings" && (
          <div className="max-w-2xl bg-[#0d1017] border border-[#1b1f2b]/60 rounded-2xl p-6.5 space-y-7 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-white">System Node Configuration</h3>
              <p className="text-xs text-slate-500 mt-1">Configure database background behaviors, currency settings, and active triggers.</p>
            </div>

            <div className="border-t border-slate-900 pt-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Background Cron Scheduler</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Automatically scan registers on startup and flag elapsed pending targets as overdue.</p>
                </div>
                <button 
                  onClick={() => setAutoCron(!autoCron)}
                  className={`w-11 h-6 rounded-full transition-all relative ${autoCron ? "bg-indigo-600" : "bg-slate-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${autoCron ? "left-6" : "left-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-900/50 pt-5">
                <div>
                  <h4 className="text-xs font-bold text-white">Consolidated Email Dispatcher</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Queue telemetry and dispatch automated payment verification alerts upon invoice save.</p>
                </div>
                <button 
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`w-11 h-6 rounded-full transition-all relative ${emailAlerts ? "bg-indigo-600" : "bg-slate-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${emailAlerts ? "left-6" : "left-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-900/50 pt-5">
                <div>
                  <h4 className="text-xs font-bold text-white">Durable Syncing Backup Ledger</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Maintain state preservation synchronization automatically across local workspace sessions.</p>
                </div>
                <button 
                  onClick={() => setCloudBackup(!cloudBackup)}
                  className={`w-11 h-6 rounded-full transition-all relative ${cloudBackup ? "bg-indigo-600" : "bg-slate-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${cloudBackup ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-6 flex items-center justify-between bg-[#0a0c12]/40 -mx-6.5 -mb-6.5 p-5 rounded-b-2xl">
              <span className="text-[10px] text-slate-500 font-mono">NODE IDENTIFIER: INVOICELY-PRIME-RUN</span>
              <button 
                onClick={handleResetSeedData}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Clear Node Cache & Reset
              </button>
            </div>
          </div>
        )}
      </main>

      {/* DRAWER MODAL 1: INVOICE DETAILS DRAWER SCREEN */}
      {selectedInvoice && !isFormOpen && (
        <InvoiceDetails
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => {
            setIsEditing(true);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteInvoice}
          onMarkStatus={handleMarkStatus}
        />
      )}

      {/* DRAWER MODAL 2: CREATION AND AMENDMENTS FORM VIEW */}
      {isFormOpen && (
        <InvoiceForm
          invoice={isEditing ? selectedInvoice : null}
          onClose={() => {
            setIsFormOpen(false);
            setIsEditing(false);
          }}
          onSave={handleSaveInvoice}
        />
      )}

      {/* COMPACT PREVIEW MODAL */}
      <AnimatePresence>
        {previewInvoice && (
          <InvoicePreviewModal
            invoice={previewInvoice}
            onClose={() => setPreviewInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
