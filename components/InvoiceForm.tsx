"use client";

import React, { useState, useEffect } from "react";
import { Invoice, InvoiceItem, InvoiceStatus } from "../lib/types";
import { Plus, Trash, X, Save, Calendar, Mail, FileText, User } from "lucide-react";
import { formatDateString } from "../lib/invoice-helper";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

interface InvoiceFormProps {
  invoice?: Invoice | null; // If editing in localstorage mode
  invoiceIdToEdit?: string; // If editing in firestore mode
  onSave?: (invoice: Omit<Invoice, "id" | "amount"> & { id?: string }) => void;
  onClose?: () => void;
}

export default function InvoiceForm({ invoice, invoiceIdToEdit, onSave, onClose }: InvoiceFormProps) {
  const { user } = useAuth();
  
  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("pending");
  const [items, setItems] = useState<Omit<InvoiceItem, "id">[]>([]);
  const [notes, setNotes] = useState("");
  
  // Tax & Discount configurations (can be defaults from Settings or overridden per invoice)
  const [taxSystem, setTaxSystem] = useState<'gst-exclusive' | 'gst-inclusive' | 'vat' | 'sales-tax'>('gst-exclusive');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [discountRate, setDiscountRate] = useState<number>(0);

  // Validation error state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // 1. Fetch user's company settings for pre-populating defaults (Tax System, Tax Rate, Discount Rate)
  useEffect(() => {
    if (!user) return;
    
    const fetchCompanySettings = async () => {
      try {
        const q = query(collection(db, "settings"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          // Pre-populate only if we are creating a new invoice
          if (!invoiceIdToEdit && !invoice) {
            setTaxSystem(data.taxSystem || "gst-exclusive");
            setTaxRate(data.taxRate !== undefined ? data.taxRate : 18);
            setDiscountRate(data.discountRate !== undefined ? data.discountRate : 0);
          }
        }
      } catch (err) {
        console.error("Error loading settings default in Form:", err);
      }
    };

    fetchCompanySettings();
  }, [user, invoiceIdToEdit, invoice]);

  // 2. Fetch invoice from firestore if in firestore edit mode
  useEffect(() => {
    if (!invoiceIdToEdit || !user) return;

    const loadDirectInvoice = async () => {
      try {
        const docRef = doc(db, "invoices", invoiceIdToEdit);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setInvoiceNumber(data.invoiceNumber || "");
          setClientName(data.customerName || "");
          setClientEmail(data.customerEmail || "");
          setIssueDate(data.issueDate || "");
          setDueDate(data.dueDate || "");
          setStatus(data.status || "pending");
          setNotes(data.notes || "");
          
          setTaxSystem(data.taxSystem || "gst-exclusive");
          setTaxRate(data.taxRate !== undefined ? data.taxRate : 18);
          setDiscountRate(data.discountRate !== undefined ? data.discountRate : 0);

          if (data.items && Array.isArray(data.items)) {
            setItems(data.items.map((it: any) => ({
              description: it.name || it.description || "",
              quantity: it.quantity || 1,
              price: it.rate || it.price || 0
            })));
          }
        }
      } catch (err) {
        console.error("Error loading firestore invoice inside form:", err);
      }
    };

    loadDirectInvoice();
  }, [invoiceIdToEdit, user]);

  // 3. Initialize fields on editing (LocalStorage mode)
  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setClientName(invoice.clientName);
      setClientEmail(invoice.clientEmail);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setStatus(invoice.status);
      setItems(invoice.items.map(it => ({ description: it.description, quantity: it.quantity, price: it.price })));
      setNotes(invoice.notes || "");
      // Fetch calculation properties if stored
      if ((invoice as any).taxSystem) setTaxSystem((invoice as any).taxSystem);
      if ((invoice as any).taxRate !== undefined) setTaxRate((invoice as any).taxRate);
      if ((invoice as any).discountRate !== undefined) setDiscountRate((invoice as any).discountRate);
    } else if (!invoiceIdToEdit) {
      // Create random draft invoice number
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${randNum}`);
      setIssueDate(formatDateString(new Date()));
      const duDate = new Date();
      duDate.setDate(duDate.getDate() + 14); // 2 weeks default
      setDueDate(formatDateString(duDate));
      setStatus("pending");
      setItems([{ description: "", quantity: 1, price: 0 }]);
      setNotes("");
    }
  }, [invoice, invoiceIdToEdit]);

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return; // Must have at least one item
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, key: "description" | "quantity" | "price", val: string | number) => {
    const updated = items.map((it, idx) => {
      if (idx === index) {
        return {
          ...it,
          [key]: val
        };
      }
      return it;
    });
    setItems(updated);
  };

  // Grand Calculations logic
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  
  let taxAmount = 0;
  let finalTotal = 0;

  if (taxSystem === "gst-inclusive") {
    // Inclusive tax: total is pre-tax + tax (subtotal - discount)
    taxAmount = taxableAmount * (taxRate / (100 + taxRate));
    finalTotal = taxableAmount;
  } else {
    // Exclusive taxes: tax is computed on top of the taxable amount
    taxAmount = taxableAmount * (taxRate / 100);
    finalTotal = taxableAmount + taxAmount;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation schema
    const newErrors: { [key: string]: string } = {};
    if (!invoiceNumber.trim()) newErrors.invoiceNumber = "Invoice number is required";
    if (!clientName.trim()) newErrors.clientName = "Client name is required";
    if (!clientEmail.trim()) {
      newErrors.clientEmail = "Client email is required";
    } else if (!/\S+@\S+\.\S+/.test(clientEmail)) {
      newErrors.clientEmail = "Enter a valid email address";
    }
    if (!issueDate) newErrors.issueDate = "Issue date is required";
    if (!dueDate) newErrors.dueDate = "Due date is required";
    
    // Check item lists
    items.forEach((it, idx) => {
      if (!it.description.trim()) {
        newErrors[`item_${idx}`] = "Description is required";
      }
      if (it.quantity <= 0) {
        newErrors[`qty_${idx}`] = "Min qty 1";
      }
      if (it.price < 0) {
        newErrors[`price_${idx}`] = "Negative price disallowed";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    
    // Transform items with unique IDs
    const formattedItems = items.map((item, idx) => ({
      id: `item_${idx}_${Date.now()}`,
      ...item
    }));

    if (onSave) {
      // LocalStorage context
      onSave({
        id: invoice?.id,
        invoiceNumber,
        clientName,
        clientEmail,
        issueDate,
        dueDate,
        status,
        items: formattedItems,
        notes,
        // Also attach the dynamic calculation attributes
        taxSystem,
        taxRate,
        discountRate,
        discountAmount,
        taxAmount,
        subtotal,
        amount: finalTotal
      } as any);
      setSaving(false);
      if (onClose) onClose();
    } else {
      // Direct Firestore context (routes like /app/invoices/new etc)
      if (!user) {
        setErrors({ submit: "Authorization required. Please log in first." });
        setSaving(false);
        return;
      }

      const firestoreItems = items.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        rate: item.price,
        amount: item.quantity * item.price
      }));

      const payload = {
        invoiceNumber,
        customerName: clientName,
        customerEmail: clientEmail,
        issueDate,
        dueDate,
        status,
        items: firestoreItems,
        subtotal,
        taxSystem,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total: finalTotal,
        notes,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      try {
        if (invoiceIdToEdit) {
          await updateDoc(doc(db, "invoices", invoiceIdToEdit), payload);
        } else {
          const docPayload = {
            ...payload,
            customerId: "custom-client-entry",
            createdAt: serverTimestamp()
          };
          await addDoc(collection(db, "invoices"), docPayload);
        }
        
        if (onClose) {
          onClose();
        } else {
          // Fallback page redirect to invoice ledger
          window.location.href = "/invoices";
        }
      } catch (err: any) {
        console.error("Direct Firestore write failed:", err);
        setErrors({ submit: "Failed to write invoice to Firestore database. Insufficient rules permission." });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose || (() => window.location.href = "/invoices")}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl bg-[#0d1017] border-l border-slate-900 text-slate-100 h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 font-sans">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-900 flex items-center justify-between bg-[#0a0c12]">
          <div>
            <h2 className="text-sm font-bold text-white">
              {invoice || invoiceIdToEdit ? `Edit Invoice: ${invoiceNumber}` : "Create New Invoice"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Add products, customer specifications, and critical billing rules.
            </p>
          </div>
          <button 
            onClick={onClose || (() => window.location.href = "/invoices")}
            className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-500 hover:text-slate-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {errors.submit && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Invoice Number</label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <FileText className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-sans"
                  placeholder="INV-2026-0001"
                />
              </div>
              {errors.invoiceNumber && <p className="text-xs text-rose-500 mt-1">{errors.invoiceNumber}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Invoice Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full mt-1 px-3.5 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-sans cursor-pointer"
              >
                <option value="pending" className="bg-[#0e111a]">Pending</option>
                <option value="paid" className="bg-[#0e111a]">Paid</option>
                <option value="overdue" className="bg-[#0e111a]">Overdue</option>
                <option value="draft" className="bg-[#0e111a]">Draft</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-5 space-y-4">
            <h3 className="text-[10px] font-bold text-[#818cf8]/70 uppercase tracking-widest font-mono">Client Details</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Client Name</label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-sans"
                  placeholder="Sarah Jenkins"
                />
              </div>
              {errors.clientName && <p className="text-xs text-rose-500 mt-1">{errors.clientName}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Client Email</label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-sans"
                  placeholder="sarah@corp.com"
                />
              </div>
              {errors.clientEmail && <p className="text-xs text-rose-500 mt-1">{errors.clientEmail}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Issue Date</label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
              {errors.issueDate && <p className="text-xs text-rose-500 mt-1">{errors.issueDate}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Due Date</label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
              {errors.dueDate && <p className="text-xs text-rose-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* ITEM ENTRIES */}
          <div className="border-t border-slate-900 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#818cf8]/70 uppercase tracking-widest font-mono">Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/15 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {items.map((item, index) => (
                <div key={index} className="bg-[#10131f]/60 p-4 rounded-xl border border-slate-900/80 space-y-3">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1">
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Item / Service Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className={`w-full mt-1.5 px-3 py-2 bg-[#090b0f] border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-slate-200 placeholder-slate-750 ${
                          errors[`item_${index}`] ? "border-rose-500/40 focus:border-rose-500" : "border-slate-800"
                        }`}
                        placeholder="e.g. Logo Design Milestone 1"
                      />
                      {errors[`item_${index}`] && <p className="text-[11px] text-rose-400 mt-0.5 font-medium">{errors[`item_${index}`]}</p>}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 mt-5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                        className="w-full mt-1.5 px-3 py-2 bg-[#090b0f] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                        className="w-full mt-1.5 px-3 py-2 bg-[#090b0f] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Subtotal</label>
                      <div className="w-full mt-1.5 px-3 py-2 bg-[#08090d] border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 font-mono flex items-center justify-between">
                        <span>₹</span>
                        <span>{(item.quantity * item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC CALCULATIONS & SYSTEM ADJUSTMENTS IN REALT-IME */}
          <div className="border-t border-slate-900 pt-5 space-y-4">
            <h3 className="text-[10px] font-bold text-[#818cf8]/70 uppercase tracking-widest font-mono">Tax & Discount Adjustments</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Active Tax System</label>
                <select
                  value={taxSystem}
                  onChange={(e) => setTaxSystem(e.target.value as any)}
                  className="w-full mt-1.5 px-3 py-2 bg-[#090b0f] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                >
                  <option value="gst-exclusive">GST (Exclusive)</option>
                  <option value="gst-inclusive">GST (Inclusive)</option>
                  <option value="vat">VAT (Value Added Tax)</option>
                  <option value="sales-tax">Sales Tax</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Override Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full mt-1.5 px-3 py-2 bg-[#090b0f] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Override Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full mt-1.5 px-3 py-2 bg-[#090b0f] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>

              <div className="bg-[#08090d] border border-slate-900 rounded-xl p-3 text-[10px] font-mono space-y-1.5 text-slate-400">
                <p className="flex justify-between">
                  <span>Gross subtotal:</span>
                  <span className="text-slate-300 font-semibold">₹ {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
                {discountAmount > 0 && (
                  <p className="flex justify-between text-emerald-400">
                    <span>Discount ({discountRate}%):</span>
                    <span>- ₹ {discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                )}
                <p className="flex justify-between text-rose-450 text-rose-400">
                  <span>
                    {taxSystem === "gst-exclusive" ? "GST Tax (Excl.):" : 
                     taxSystem === "gst-inclusive" ? "GST Tax (Incl.):" : 
                     taxSystem === "vat" ? "VAT Tax:" : "Sales Tax:"} ({taxRate}%):
                  </span>
                  <span>
                    {taxSystem === "gst-inclusive" ? "(Included) " : "+ "}
                    ₹ {taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Notes / Payment Terms</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 bg-[#090b0f] border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-700/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition h-20 resize-none font-sans"
              placeholder="Provide wire details, due terms, or appreciation messages."
            />
          </div>
        </form>

        {/* Footer Actions with Grand Total formatted in Rupees */}
        <div className="px-6 py-4 border-t border-slate-900 bg-[#0a0c12] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold font-mono">Grand Total</span>
            <span className="text-lg font-bold text-[#818cf8] font-mono">
              ₹ {finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose || (() => window.location.href = "/invoices")}
              className="px-4 py-2 bg-[#121520] hover:bg-slate-800 border border-slate-850 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-600/10 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{saving ? "Saving..." : "Save Invoice"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
