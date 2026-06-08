'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  setDoc, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Settings as SettingsIcon, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Save, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Check, 
  Sparkles,
  AlertCircle,
  CreditCard,
  Palette,
  Bell,
  Users,
  Globe,
  DollarSign,
  Briefcase,
  ShieldAlert,
  ArrowRight,
  Info,
  CheckCircle2,
  Trash,
  Sliders,
  Sparkle,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Product Catalog interface matches prior spec
interface Product {
  id: string;
  name: string;
  description: string;
  rate: number;
}

// Team Member Interface
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Accountant' | 'Staff';
  status: 'Active' | 'Pending Invite';
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  
  // Settings Tab Router
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'invoice-rules' | 'payments' | 'branding' | 'notifications' | 'team' | 'products'>('profile');
  const [loading, setLoading] = useState(true);

  // 1. Business Profile State
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [taxId, setTaxId] = useState(''); // GST Number
  const [panNumber, setPanNumber] = useState('');

  // 2. Invoice Settings State
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [startingNumber, setStartingNumber] = useState('1001');
  const [currency, setCurrency] = useState('INR');
  const [taxSystem, setTaxSystem] = useState<'gst-exclusive' | 'gst-inclusive' | 'vat' | 'sales-tax'>('gst-exclusive');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState('Net 14');
  const [defaultDueDateOffset, setDefaultDueDateOffset] = useState<number>(14);
  const [paymentDetails, setPaymentDetails] = useState(''); // Textarea custom notes / payment terms

  // 3. Payment settings
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [googlePaySupport, setGooglePaySupport] = useState(true);
  const [phonePeSupport, setPhonePeSupport] = useState(true);
  const [paytmSupport, setPaytmSupport] = useState(true);
  const [paymentInstructions, setPaymentInstructions] = useState('Please scan the QR code to complete payment instantly.');

  // 4. Branding settings
  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [primaryBrandColor, setPrimaryBrandColor] = useState('#6366f1');
  const [accentColor, setAccentColor] = useState('#4f46e5');
  const [pdfTheme, setPdfTheme] = useState('indigo-royal'); // 'indigo-royal' | 'emerald-clean' | 'slate-dark' | 'sunset-warm'
  const [invoiceTemplate, setInvoiceTemplate] = useState('professional'); // 'professional' | 'classic' | ' академический' | 'compact'

  // 5. Notifications settings
  const [notifyInvoiceSent, setNotifyInvoiceSent] = useState(true);
  const [notifyPaymentReceived, setNotifyPaymentReceived] = useState(true);
  const [notifyOverdueAlert, setNotifyOverdueAlert] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);

  // 6. Team management settings
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Accountant' | 'Staff'>('Staff');

  // Client Services inventory state (preserving standard tab data)
  const [products, setProducts] = useState<Product[]>([]);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodRate, setProdRate] = useState<number>(0);

  // Database tracking settingsId
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Status logs & alerts
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  
  // Realtime Custom Toast notification array
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'sync' }[]>([]);

  const handleShowToast = (message: string, type: 'success' | 'error' | 'sync' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Pre-seed team members default state if none found
  const getDefaultTeamInit = (ownerEmail: string, ownerName: string) => [
    { id: 'owner-uid', name: ownerName || 'Ranju Devi', email: ownerEmail || 'ranjudevi55728@gmail.com', role: 'Owner' as const, status: 'Active' as const },
    { id: 'member-1', name: 'Anjali Sharma', email: 'anjali@consulting.co', role: 'Accountant' as const, status: 'Active' as const },
    { id: 'member-2', name: 'Rohan Gupta', email: 'rohan@technode.io', role: 'Staff' as const, status: 'Pending Invite' as const }
  ];

  // Load configuration record from Db on start
  useEffect(() => {
    if (!user) return;

    const qSettings = query(collection(db, 'settings'), where('userId', '==', user.uid));
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        const data = d.data();
        setSettingsId(d.id);
        
        // 1. Business Profile
        setCompanyName(data.companyName || '');
        setCompanyEmail(data.companyEmail || '');
        setCompanyPhone(data.companyPhone || '');
        setWebsiteUrl(data.websiteUrl || '');
        setCompanyAddress(data.companyAddress || '');
        setTaxId(data.taxId || '');
        setPanNumber(data.panNumber || '');

        // 2. Invoice Settings
        setInvoicePrefix(data.invoicePrefix || 'INV-');
        setStartingNumber(data.startingNumber || '1001');
        setCurrency(data.currency || 'INR');
        setTaxSystem(data.taxSystem || 'gst-exclusive');
        setTaxRate(data.taxRate !== undefined ? data.taxRate : 18);
        setDiscountRate(data.discountRate !== undefined ? data.discountRate : 0);
        setPaymentTerms(data.paymentTerms || 'Net 14');
        setDefaultDueDateOffset(data.defaultDueDateOffset !== undefined ? data.defaultDueDateOffset : 14);
        setPaymentDetails(data.paymentDetails || '');

        // 3. Payments Support
        setUpiId(data.upiId || '');
        setUpiName(data.upiName || '');
        setBankName(data.bankName || '');
        setBankAccountNumber(data.bankAccountNumber || '');
        setIfscCode(data.ifscCode || '');
        setGooglePaySupport(data.googlePaySupport !== undefined ? data.googlePaySupport : true);
        setPhonePeSupport(data.phonePeSupport !== undefined ? data.phonePeSupport : true);
        setPaytmSupport(data.paytmSupport !== undefined ? data.paytmSupport : true);
        setPaymentInstructions(data.paymentInstructions || 'Please scan the QR code to complete payment instantly.');

        // 4. Branding config
        setLogoUrl(data.logoUrl || '');
        setStampUrl(data.stampUrl || '');
        setSignatureUrl(data.signatureUrl || '');
        setPrimaryBrandColor(data.primaryBrandColor || '#6366f1');
        setAccentColor(data.accentColor || '#4f46e5');
        setPdfTheme(data.pdfTheme || 'indigo-royal');
        setInvoiceTemplate(data.invoiceTemplate || 'professional');

        // 5. Notifications setup
        setNotifyInvoiceSent(data.notifyInvoiceSent !== undefined ? data.notifyInvoiceSent : true);
        setNotifyPaymentReceived(data.notifyPaymentReceived !== undefined ? data.notifyPaymentReceived : true);
        setNotifyOverdueAlert(data.notifyOverdueAlert !== undefined ? data.notifyOverdueAlert : true);
        setNotifyEmail(data.notifyEmail !== undefined ? data.notifyEmail : true);
        setNotifyWhatsapp(data.notifyWhatsapp !== undefined ? data.notifyWhatsapp : false);

        // 6. Team array
        if (data.teamMembers && Array.isArray(data.teamMembers)) {
          setTeamMembers(data.teamMembers);
        } else {
          setTeamMembers(getDefaultTeamInit(user.email || '', user.displayName || ''));
        }

      } else {
        // Pop fallback placeholders based on user record
        setCompanyName(user.displayName ? `${user.displayName} Consulting` : '');
        setCompanyEmail(user.email || '');
        setTeamMembers(getDefaultTeamInit(user.email || '', user.displayName || ''));
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching settings values: ', error);
      handleShowToast('Unable to synchronize live cloud settings.', 'error');
      handleFirestoreError(error, OperationType.LIST, 'settings');
    });

    // Load available products catalog
    const qProducts = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const docs: Product[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        docs.push({
          id: d.id,
          name: data.name,
          description: data.description || '',
          rate: data.rate || 0,
        });
      });
      setProducts(docs);
    }, (error) => {
      console.error('Error fetching products catalog: ', error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribeSettings();
      unsubscribeProducts();
    };
  }, [user]);

  // Master Save Payload trigger (Handles manual sync values or major form submit)
  const handleSaveSettings = async (tabName?: string) => {
    if (!user) return;
    setSavingSettings(true);

    if (!companyName || !companyEmail) {
      handleShowToast('Company Name and Business Email are required profiles.', 'error');
      setSavingSettings(false);
      return;
    }

    const payload = {
      userId: user.uid,
      companyName,
      companyEmail,
      companyPhone,
      websiteUrl,
      companyAddress,
      taxId,
      panNumber,

      invoicePrefix,
      startingNumber,
      currency,
      taxSystem,
      taxRate: Number(taxRate) || 0,
      discountRate: Number(discountRate) || 0,
      paymentTerms,
      defaultDueDateOffset: Number(defaultDueDateOffset) || 14,
      paymentDetails,

      upiId,
      upiName,
      bankName,
      bankAccountNumber,
      ifscCode,
      googlePaySupport,
      phonePeSupport,
      paytmSupport,
      paymentInstructions,

      logoUrl,
      stampUrl,
      signatureUrl,
      primaryBrandColor,
      accentColor,
      pdfTheme,
      invoiceTemplate,

      notifyInvoiceSent,
      notifyPaymentReceived,
      notifyOverdueAlert,
      notifyEmail,
      notifyWhatsapp,
      teamMembers,
      updatedAt: serverTimestamp()
    };

    try {
      if (settingsId) {
        await setDoc(doc(db, 'settings', settingsId), payload, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, 'settings'), payload);
        setSettingsId(docRef.id);
      }
      handleShowToast(
        tabName ? `${tabName} settings synchronized.` : 'Global settings written successfully to Firestore!', 
        'success'
      );
    } catch (err) {
      console.error('Firestore save failed:', err);
      handleShowToast('Permission blocked or invalid structure in document transaction.', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Instant reactive trigger for toggle buttons (similar to Stripe Dashboard UX)
  const triggerToggleInstantAndSave = async (key: string, currentValue: boolean) => {
    if (!user) return;
    
    // Optimistic UI updates
    let updatedGooglePay = googlePaySupport;
    let updatedPhonePe = phonePeSupport;
    let updatedPaytm = paytmSupport;
    let updatedSent = notifyInvoiceSent;
    let updatedRecv = notifyPaymentReceived;
    let updatedOverdue = notifyOverdueAlert;
    let updatedEmail = notifyEmail;
    let updatedWhatsapp = notifyWhatsapp;

    if (key === 'googlePaySupport') { setGooglePaySupport(!currentValue); updatedGooglePay = !currentValue; }
    if (key === 'phonePeSupport') { setPhonePeSupport(!currentValue); updatedPhonePe = !currentValue; }
    if (key === 'paytmSupport') { setPaytmSupport(!currentValue); updatedPaytm = !currentValue; }
    
    if (key === 'notifyInvoiceSent') { setNotifyInvoiceSent(!currentValue); updatedSent = !currentValue; }
    if (key === 'notifyPaymentReceived') { setNotifyPaymentReceived(!currentValue); updatedRecv = !currentValue; }
    if (key === 'notifyOverdueAlert') { setNotifyOverdueAlert(!currentValue); updatedOverdue = !currentValue; }
    if (key === 'notifyEmail') { setNotifyEmail(!currentValue); updatedEmail = !currentValue; }
    if (key === 'notifyWhatsapp') { setNotifyWhatsapp(!currentValue); updatedWhatsapp = !currentValue; }

    const payloadPatch = {
      googlePaySupport: updatedGooglePay,
      phonePeSupport: updatedPhonePe,
      paytmSupport: updatedPaytm,
      notifyInvoiceSent: updatedSent,
      notifyPaymentReceived: updatedRecv,
      notifyOverdueAlert: updatedOverdue,
      notifyEmail: updatedEmail,
      notifyWhatsapp: updatedWhatsapp,
    };

    try {
      if (settingsId) {
        await setDoc(doc(db, 'settings', settingsId), payloadPatch, { merge: true });
        handleShowToast('Preferences auto-saved to cloud', 'sync');
      } else {
        // If settings doc doesn't exist yet, save full record
        await handleSaveSettings('Auto-save preferences');
      }
    } catch (err) {
      console.error('Error auto-saving toggle:', err);
      handleShowToast('Unable to auto-save change', 'error');
    }
  };

  // 4. Product Catalog builders (preserving existing functionalities)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddingProduct(true);

    if (!prodName || prodRate <= 0) {
      handleShowToast('Product index requires name and a positive rate.', 'error');
      setAddingProduct(false);
      return;
    }

    try {
      await addDoc(collection(db, 'products'), {
        name: prodName,
        description: prodDesc,
        rate: Number(prodRate) || 0,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setProdName('');
      setProdDesc('');
      setProdRate(0);
      handleShowToast('Catalog ledger pricing point registered!', 'success');
    } catch (err) {
      console.error('Failed to add product: ', err);
      handleShowToast('Permission denied to register product catalog.', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product/service priced model from catalog?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      handleShowToast('Pricing module removed from listings', 'success');
    } catch (err) {
      console.error('Error deleting product catalog item: ', err);
      handleShowToast('Unregistering product failed', 'error');
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // Team Member Management
  const handleInviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      handleShowToast('Provide valid email and name parameters to invite.', 'error');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      handleShowToast('Please provide a valid recipient email.', 'error');
      return;
    }

    const newMember: TeamMember = {
      id: 'member-' + Date.now().toString(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending Invite'
    };

    const updatedMembersList = [...teamMembers, newMember];
    setTeamMembers(updatedMembersList);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('Staff');

    // Live sync team updates to firestore
    try {
      if (settingsId) {
        await setDoc(doc(db, 'settings', settingsId), { teamMembers: updatedMembersList }, { merge: true });
        handleShowToast('Sent instant collaboration invite to ' + inviteName, 'success');
      } else {
        handleShowToast('Setup your Business Profile first to initialize team data.', 'error');
      }
    } catch (err) {
      console.error('Failed to update team array:', err);
      handleShowToast('Failed to write client team structures to cloud database.', 'error');
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (memberId === 'owner-uid') {
      handleShowToast('The master system billing account owner cannot be removed.', 'error');
      return;
    }

    const updated = teamMembers.filter((t) => t.id !== memberId);
    setTeamMembers(updated);

    try {
      if (settingsId) {
        await setDoc(doc(db, 'settings', settingsId), { teamMembers: updated }, { merge: true });
        handleShowToast('Revoked team credentials successfully', 'success');
      }
    } catch (err) {
      console.error('Unable to remove team member:', err);
    }
  };

  // Base64 file loaders for images (Logos, signature stamps)
  const handleImageUploadBase64 = (file: File, type: 'logo' | 'stamp' | 'signature') => {
    if (file.size > 1.2 * 1024 * 1024) {
      handleShowToast('Image size exceeds 1.2MB target limit. Use parsed compact sizes.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (type === 'logo') { setLogoUrl(base64); }
      if (type === 'stamp') { setStampUrl(base64); }
      if (type === 'signature') { setSignatureUrl(base64); }
      
      // Auto-save image base64 directly to cloud
      try {
        if (settingsId) {
          await setDoc(doc(db, 'settings', settingsId), { [type === 'logo' ? 'logoUrl' : type === 'stamp' ? 'stampUrl' : 'signatureUrl']: base64 }, { merge: true });
          handleShowToast(`Custom branding ${type} updated & synced!`, 'success');
        } else {
          handleShowToast(`Local custom branding ${type} loaded. Click update to save!`, 'sync');
        }
      } catch (err) {
        handleShowToast('Error caching image parameters in Cloud.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Compute live UPI Pay Link for dynamic preview
  const placeholderUpiId = upiId || 'acmecorp@okaxis';
  const placeholderUpiName = upiName || 'Acme Corp Private Limited';
  const previewAmount = 45000;
  const upiPayUri = `upi://pay?pa=${placeholderUpiId}&pn=${encodeURIComponent(placeholderUpiName)}&am=${previewAmount}&cu=INR&tn=Invoice%20Preview`;
  const upiQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=ffffff&color=090d16&margin=1&data=${encodeURIComponent(upiPayUri)}`;

  return (
    <div className="flex bg-[#07090e] text-slate-100 min-h-screen font-sans overflow-hidden">
      {/* Dynamic Toast Alerts Container Floating top-right */}
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-xl flex items-start gap-3 border pointer-events-auto backdrop-blur-md ${
                toast.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/20 text-rose-300'
                  : toast.type === 'sync'
                  ? 'bg-slate-900/90 border-indigo-500/20 text-indigo-300'
                  : 'bg-[#0f1422]/90 border-emerald-500/20 text-emerald-300'
              }`}
            >
              <div className="mt-0.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : toast.type === 'sync' ? (
                  <Sparkle className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold leading-normal">{toast.message}</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date().toLocaleTimeString()}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sidebar currentTab="settings" onChangeTab={(tab) => { window.location.href = tab === 'settings' ? '/settings' : tab === 'dashboard' ? '/' : `/${tab}`; }} onResetSeedData={() => {}} flaggedLog={[]} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Section */}
        <header className="h-16 border-b border-white/5 pl-18 pr-4 sm:px-8 flex items-center justify-between shrink-0 bg-[#090b10]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4.5 h-4.5 text-indigo-400" />
            <h1 className="text-md font-extrabold text-white tracking-tight">Console Configuration</h1>
            <span className="hidden md:inline-block px-2 py-0.5 text-[9px] bg-slate-900 border border-white/5 uppercase font-mono tracking-widest text-[#818cf8] rounded-md font-bold">Stripe Sync v1</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleSaveSettings()}
              disabled={savingSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 rounded-xl text-[10px] font-bold text-white transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {savingSettings ? (
                <span className="w-3 h-3 border-2 border-white/25 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Commit States</span>
            </button>
          </div>
        </header>

        {/* Dashboard Setting Workspace Grid Split Inner Side View */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LOCAL SETTINGS TAB NAVIGATION BAR (Stripe Layout) */}
          <aside className="hidden lg:flex w-64 bg-[#090b10] border-r border-white/5 flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Control Settings</h2>
              <p className="text-[10px] text-slate-600 mt-0.5">Manage business modules & channels.</p>
            </div>
            
            <nav className="p-3 space-y-1">
              {[
                { id: 'profile', label: 'Business Profile', desc: 'Addresses, tax details, firm info', icon: Building },
                { id: 'invoice-rules', label: 'Invoice Rules', desc: 'Currency & payment defaults', icon: FileText },
                { id: 'payments', label: 'Payment Settings', desc: 'UPI & Bank wire transfers', icon: CreditCard },
                { id: 'branding', label: 'Branding & Templates', desc: 'Colors, signature, stamps', icon: Palette },
                { id: 'notifications', label: 'Notifications Hub', desc: 'Whatsapp, emails & alerts', icon: Bell },
                { id: 'team', label: 'Team Collaboration', desc: 'Invite team & roles configuration', icon: Users },
                { id: 'products', label: 'Inventory Catalogue', desc: 'Standard services & standard prices', icon: ShoppingBag }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const active = activeSettingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id as any)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                      active 
                        ? 'bg-[#121622] border border-indigo-500/10' 
                        : 'hover:bg-slate-900/50 hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-none ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{tab.label}</p>
                      <p className="text-[9px] text-slate-500 font-medium truncate mt-1">{tab.desc}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
            
            <div className="mt-auto p-4 border-t border-white/5 bg-[#07090d]/30 text-center">
              <span className="text-[10px] font-mono font-medium text-slate-600">Merchant Nodes Registered: 2</span>
            </div>
          </aside>

          {/* MAIN SETTINGS PANEL CONTENT */}
          <div className="flex-1 bg-[#0b0d14] p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6">
            
            {/* Horizontal Mobile Tabs switcher bar */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-white/5 mb-2">
              {[
                { id: 'profile', label: 'Profile' },
                { id: 'invoice-rules', label: 'Rules' },
                { id: 'payments', label: 'Payments' },
                { id: 'branding', label: 'Branding' },
                { id: 'notifications', label: 'Alerts' },
                { id: 'team', label: 'Team' },
                { id: 'products', label: 'Inventory' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveSettingsTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeSettingsTab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Syncing merchant environment data...</span>
              </div>
            ) : (
              <motion.div
                key={activeSettingsTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="max-w-4xl mx-auto space-y-6"
              >
                
                {/* 1. BUSINESS PROFILE TAB */}
                {activeSettingsTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4.5 gap-4">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-indigo-400" />
                          <div>
                            <h3 className="font-extrabold text-white text-sm">Business Identity Registry</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">Define corporate parameters written on clients payment layouts.</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono px-3 py-1 border border-indigo-500/15 rounded-full font-bold self-start sm:self-center">Verified Corporate Node</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Logo Upload Block inline inside Business profile top */}
                        <div className="md:col-span-2 bg-[#080a0f] border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                          <div className="relative h-18 w-18 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                            {logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                            ) : (
                              <Building className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                          <div className="text-center sm:text-left space-y-2">
                            <h4 className="text-xs font-bold text-white leading-none">Registered Company Icon</h4>
                            <p className="text-[10px] text-slate-500 leading-normal">PNG, JPEG maximum size 1.2MB. Stored locally inside persistent firestore.</p>
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                              <input 
                                type="file" 
                                id="logo-uploader-profile" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUploadBase64(file, 'logo');
                                }}
                              />
                              <label 
                                htmlFor="logo-uploader-profile" 
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[10px] tracking-wide font-mono font-bold text-slate-300 transition cursor-pointer inline-block"
                              >
                                SELECT FILE
                              </label>
                              {logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setLogoUrl('')}
                                  className="text-[10px] text-rose-400 font-mono hover:underline"
                                >
                                  RETRACT
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Company / Trader Name *</label>
                          <input 
                            type="text" 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50 transition"
                            placeholder="e.g. Acme Services LLC"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Business Email Address *</label>
                          <input 
                            type="email" 
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50 transition"
                            placeholder="billing@acmeservices.com"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Phone Number</label>
                          <input 
                            type="text" 
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. +91 98765 43210"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Business Homepage Website URL</label>
                          <input 
                            type="text" 
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50"
                            placeholder="https://acmeservices.com"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">GSTIN / Corporate Tax ID State Code</label>
                          <input 
                            type="text" 
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. 27AAAAA1111A1Z1"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Income Tax PAN Number Index</label>
                          <input 
                            type="text" 
                            value={panNumber}
                            onChange={(e) => setPanNumber(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. ABCDE1234F"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Physical Registered Office Street Address</label>
                          <textarea 
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            rows={3}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700/80 focus:outline-none focus:border-indigo-500/50 resize-none"
                            placeholder="Acme Chambers, 23 Guild Hall Way, New Delhi, India 110001"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings('Business Profile')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-white text-xs font-bold"
                        >
                          Save Profile Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. INVOICE RULES & DEFAULTS TAB */}
                {activeSettingsTab === 'invoice-rules' && (
                  <div className="space-y-6">
                    <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4.5">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-white text-sm">Invoice Configuration Rules</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Control default invoice serialization structure, VAT parameters, and payment timelines.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Default Invoice Prefix</label>
                          <input 
                            type="text" 
                            value={invoicePrefix}
                            onChange={(e) => setInvoicePrefix(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                            placeholder="e.g. INV-"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Starting Invoice Number Sequence</label>
                          <input 
                            type="text" 
                            value={startingNumber}
                            onChange={(e) => setStartingNumber(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                            placeholder="e.g. 1001"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Master Currency System</label>
                          <select 
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs cursor-pointer"
                          >
                            <option value="INR">INR (Indian Rupee - ₹)</option>
                            <option value="USD">USD (US Dollar - $)</option>
                            <option value="EUR">EUR (European Euro - €)</option>
                            <option value="GBP">GBP (British Pound - £)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Default Payment Terms Options</label>
                          <select 
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs cursor-pointer"
                          >
                            <option value="Upon Receipt">Due Upon Receipt</option>
                            <option value="Net 7">Net 7 Days</option>
                            <option value="Net 14">Net 14 Days</option>
                            <option value="Net 30">Net 30 Days</option>
                            <option value="Net 45">Net 45 Days</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Default Due Timeline (Days Offset)</label>
                          <input 
                            type="number" 
                            value={defaultDueDateOffset}
                            onChange={(e) => setDefaultDueDateOffset(Math.max(1, Number(e.target.value) || 14))}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                            placeholder="14"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Standard Tax Compliance System</label>
                          <select 
                            value={taxSystem}
                            onChange={(e) => setTaxSystem(e.target.value as any)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs cursor-pointer"
                          >
                            <option value="gst-exclusive">GST (Exclusive)</option>
                            <option value="gst-inclusive">GST (Inclusive)</option>
                            <option value="vat">VAT (Value Added Tax)</option>
                            <option value="sales-tax">General Sales Tax (Sales Tax)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Fallback Base Tax Rate (%)</label>
                          <input 
                            type="number" 
                            value={taxRate}
                            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                            placeholder="18"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Base Discount Rate Per Invoice (%)</label>
                          <input 
                            type="number" 
                            value={discountRate}
                            onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                            placeholder="0"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Standard Invoice Terms / Payment Notes Footer</label>
                          <textarea 
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                            rows={3}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white resize-none"
                            placeholder="e.g. Please wire transfer corporate payments to the bank specifications listed above. Late fees of 2% may arise."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings('Invoice Settings')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-white text-xs font-bold"
                        >
                          Update Default Registers
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PAYMENT SETTINGS TAB */}
                {activeSettingsTab === 'payments' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Setup Fields Column */}
                    <div className="lg:col-span-2 bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4.5">
                        <CreditCard className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-white text-sm">Fintech & Settlement Terminals</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Link instantaneous UPI accounts and legacy wire routing credentials.</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">UPI ID (Virtual Pay Address)</label>
                            <input 
                              type="text" 
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                              placeholder="e.g. acme@okaxis"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">UPI Payee Merchant Name</label>
                            <input 
                              type="text" 
                              value={upiName}
                              onChange={(e) => setUpiName(e.target.value)}
                              className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                              placeholder="e.g. Acme Services Pvt Ltd"
                            />
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4">
                          <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider font-mono">Bank Wire Routing Parameters</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] uppercase font-mono font-bold text-slate-500 mb-1.5">Bank Account Holder Name</label>
                              <input 
                                type="text" 
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                                placeholder="IndusInd Bank / HDFC"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold text-slate-500 mb-1.5">Branch IFSC Code</label>
                              <input 
                                type="text" 
                                value={ifscCode}
                                onChange={(e) => setIfscCode(e.target.value)}
                                className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                                placeholder="e.g. INDB0000001"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] uppercase font-mono font-bold text-slate-500 mb-1.5">Account Number (IBAN/Standard Digit)</label>
                              <input 
                                type="text" 
                                value={bankAccountNumber}
                                onChange={(e) => setBankAccountNumber(e.target.value)}
                                className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white"
                                placeholder="e.g. 100099384822"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 space-y-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Accepted Mobile Gateway Channels</h4>
                          
                          <div className="space-y-2">
                            {[
                              { key: 'googlePaySupport', label: 'Google Pay Settlement Integration', val: googlePaySupport },
                              { key: 'phonePeSupport', label: 'PhonePe UPI QR Channel', val: phonePeSupport },
                              { key: 'paytmSupport', label: 'Paytm Smart Business Scanner', val: paytmSupport }
                            ].map((ch) => (
                              <div key={ch.key} className="flex items-center justify-between p-3 bg-[#080a0f] border border-white/5 rounded-xl">
                                <div>
                                  <p className="text-xs font-bold text-white">{ch.label}</p>
                                  <p className="text-[10px] text-slate-500">Inject payment link protocols automatically into client pdf template.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => triggerToggleInstantAndSave(ch.key, ch.val)}
                                  className={`w-11 h-6 rounded-full transition-all relative ${ch.val ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                >
                                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${ch.val ? 'left-6' : 'left-1'}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-500 mb-1.5">Specific Payment Instructions Text</label>
                          <textarea 
                            value={paymentInstructions}
                            onChange={(e) => setPaymentInstructions(e.target.value)}
                            rows={2}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white resize-none"
                            placeholder="Instructions shown alongside QR preview..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings('Settlement Channels')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-white text-xs font-bold"
                        >
                          Sync Settlement Routing
                        </button>
                      </div>
                    </div>

                    {/* QR Code Realtime Preview Panel */}
                    <div className="space-y-6">
                      <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Dynamic UPI QR Preview</h4>
                        <p className="text-[10px] text-slate-500">Auto-regenerates instantly in sandbox on value adjustments.</p>
                        
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-indigo-500/10">
                          {upiId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={upiQrImgUrl} 
                              alt="Generated UPI QR code" 
                              className="h-36 w-36 object-contain"
                              onError={(e) => {
                                // Fallback image representation
                                (e.target as any).src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=dummy@ok&am=1';
                              }}
                            />
                          ) : (
                            <div className="h-36 w-36 bg-slate-100 flex flex-col items-center justify-center rounded-xl p-4 gap-1.5 text-slate-400">
                              <Info className="w-5 h-5 text-slate-400 text-indigo-500 animate-bounce" />
                              <span className="text-[9px] font-bold text-slate-705 font-mono text-center">Add UPI address to render QR!</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full text-left bg-[#080a0f] p-4 rounded-xl space-y-2 border border-white/5">
                          <p className="text-[9px] text-[#818cf8] font-mono leading-none tracking-wider uppercase font-bold">LIVE METRIC</p>
                          <p className="text-[11px] text-slate-200 font-bold truncate leading-snug">{placeholderUpiName}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{placeholderUpiId}</p>
                          <p className="text-[10px] text-slate-400 font-semibold pt-1 text-center font-mono border-t border-white/5">₹ {previewAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        
                        <p className="text-[9px] text-slate-500 italic max-w-xs leading-normal">
                          {paymentInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. BRANDING DESIGN TAB */}
                {activeSettingsTab === 'branding' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Select Elements and branding uploader column */}
                    <div className="lg:col-span-2 bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4.5">
                        <Palette className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-white text-sm">Theme Design & Media Elements</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Customize company stamp vectors, digital e-authorization signatures, and PDF layout models.</p>
                        </div>
                      </div>

                      <div className="space-y-6 text-xs col-span-2">
                        {/* Stamp & Authorized Signatures files block */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-[#080a0f] border border-white/5 p-4 rounded-xl space-y-2 text-center sm:text-left">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Company Rubber Stamp</h4>
                            <p className="text-[9px] text-slate-500 mb-2">Overlay seal elements in standard PDF bills. Select file (Max 1MB).</p>
                            <input 
                              type="file" 
                              id="stamp-file-input" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUploadBase64(file, 'stamp');
                              }}
                            />
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                              <label htmlFor="stamp-file-input" className="px-3.5 py-1.5 bg-slate-900 border border-white/10 text-[9px] font-mono text-slate-300 font-bold rounded-lg cursor-pointer">
                                {stampUrl ? 'REPLACE SEAL' : 'UPLOAD SEAL'}
                              </label>
                              {stampUrl && (
                                <button type="button" onClick={() => setStampUrl('')} className="text-[9px] text-rose-400 font-mono">DELETE</button>
                              )}
                            </div>
                            {stampUrl && (
                              <div className="mt-2 h-14 w-28 bg-white/5 rounded-lg flex items-center justify-center p-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={stampUrl} alt="Stamp" className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                          </div>

                          <div className="bg-[#080a0f] border border-white/5 p-4 rounded-xl space-y-2 text-center sm:text-left">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Digital Signature E-Sign</h4>
                            <p className="text-[9px] text-slate-500 mb-2">Drawings or clear scans. Overlay onto signature panels. Select File.</p>
                            <input 
                              type="file" 
                              id="sig-file-input" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUploadBase64(file, 'signature');
                              }}
                            />
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                              <label htmlFor="sig-file-input" className="px-3.5 py-1.5 bg-slate-900 border border-white/10 text-[9px] font-mono text-slate-300 font-bold rounded-lg cursor-pointer">
                                {signatureUrl ? 'REPLACE SIGN' : 'UPLOAD SIGN'}
                              </label>
                              {signatureUrl && (
                                <button type="button" onClick={() => setSignatureUrl('')} className="text-[9px] text-rose-400 font-mono">DELETE</button>
                              )}
                            </div>
                            {signatureUrl && (
                              <div className="mt-2 h-14 w-28 bg-white/5 rounded-lg flex items-center justify-center p-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Themes Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Branding PDF Theme Spec</label>
                            <select 
                              value={pdfTheme}
                              onChange={(e) => setPdfTheme(e.target.value)}
                              className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs cursor-pointer"
                            >
                              <option value="indigo-royal">Indigo Royal Accent</option>
                              <option value="emerald-clean">Emerald Clean Minimalist</option>
                              <option value="slate-dark">Slate Cyber Dark</option>
                              <option value="sunset-warm">Sunset Warm Amber</option>
                              <option value="crimson-modern">Crimson Fire Modern</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Invoice PDF Template</label>
                            <select 
                              value={invoiceTemplate}
                              onChange={(e) => setInvoiceTemplate(e.target.value)}
                              className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs cursor-pointer"
                            >
                              <option value="professional">Professional standard structure</option>
                              <option value="classic">Retro Classique Blueprint</option>
                              <option value="academic">Academic Corporate Ledger</option>
                              <option value="compact">Dense Mini Itemized</option>
                            </select>
                          </div>
                        </div>

                        {/* Theme Hex colors manually adjustable */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Primary Branding Hex Color</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={primaryBrandColor}
                                onChange={(e) => setPrimaryBrandColor(e.target.value)}
                                className="w-10 h-10 bg-transparent border-0 cursor-pointer shrink-0 rounded-lg"
                              />
                              <input 
                                type="text"
                                value={primaryBrandColor}
                                onChange={(e) => setPrimaryBrandColor(e.target.value)}
                                className="flex-1 bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white font-mono text-center uppercase"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Secondary Accent Hex Color</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="w-10 h-10 bg-transparent border-0 cursor-pointer shrink-0 rounded-lg"
                              />
                              <input 
                                type="text"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="flex-1 bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white font-mono text-center uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings('Design Parameters')}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-white text-xs font-bold"
                        >
                          Commit Style Settings
                        </button>
                      </div>
                    </div>

                    {/* PDF Style Mockup Preview Card Column */}
                    <div className="space-y-6">
                      <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Invoice Brand Preview</h4>
                        <p className="text-[10px] text-slate-500">Live generated mockup of chosen branding and color templates.</p>

                        {/* Interactive UI Mockup */}
                        <div className="w-full bg-[#080a0f] rounded-xl border border-white/5 p-4 space-y-4 shadow-2xl relative overflow-hidden text-[10px]">
                          {/* Accent bar colored dynamically on top */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1" 
                            style={{ backgroundColor: primaryBrandColor }}
                          />

                          <div className="flex justify-between items-start pt-1.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="h-4 w-4 bg-white/5 rounded flex items-center justify-center">
                                  {logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoUrl} alt="P" className="h-full w-full object-contain" />
                                  ) : (
                                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                                  )}
                                </div>
                                <span className="font-bold text-white truncate max-w-[100px]">{companyName || 'Merchants Ltd.'}</span>
                              </div>
                              <p className="text-[8px] text-slate-500 font-mono">GST: {taxId || 'Not registered'}</p>
                            </div>

                            <div className="text-right">
                              <span 
                                className="font-bold inline-block text-[9px] px-2 py-0.5 rounded-full font-mono uppercase"
                                style={{ backgroundColor: primaryBrandColor + '15', color: primaryBrandColor }}
                              >
                                {invoicePrefix}0042
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3.5 space-y-1.5 text-slate-400">
                            <div className="flex justify-between">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono">Consultation Hub Tier 3</span>
                              <span className="font-mono text-white text-[9px]">₹ 40,000.00</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Tax ({taxRate}%):</span>
                              <span style={{ color: accentColor }}>+ ₹ {(40000 * taxRate / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-xs">
                            <span className="text-[8px] uppercase font-mono text-slate-500">Total amount</span>
                            <span className="font-extrabold text-white font-mono">₹ {(40000 + (40000 * taxRate / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>

                          {/* Stamp preview if uploaded */}
                          {stampUrl && (
                            <div className="absolute bottom-10 right-4 h-10 w-20 opacity-40 pointer-events-none rotate-6 flex items-center justify-center p-1 bg-white/5 rounded">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={stampUrl} alt="Rubber Stamp Preview" className="max-h-full max-w-full object-contain" />
                            </div>
                          )}

                          {/* Base signature preview */}
                          {signatureUrl && (
                            <div className="pt-2 text-right border-t border-white/5 border-dashed">
                              <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono mb-1.5">Authorized Sign</p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={signatureUrl} alt="Signature E-Sign" className="h-6 object-contain inline-block" />
                            </div>
                          )}
                        </div>

                        {/* Interactive Selection indicators */}
                        <div className="space-y-2 text-[10px] font-mono text-slate-400">
                          <p className="flex justify-between border-t border-white/5 pt-2">
                            <span>Selected Theme:</span>
                            <span className="text-white uppercase font-bold">{pdfTheme}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Active Blueprint:</span>
                            <span className="text-indigo-400 font-bold capitalize">{invoiceTemplate}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. NOTIFICATIONS TAB */}
                {activeSettingsTab === 'notifications' && (
                  <div className="space-y-6">
                    <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4.5">
                        <Bell className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-white text-sm">Automated Event Transmitters</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Toggle instant trigger alerts when invoices update, payments clear, or dates collapse as overdue.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { 
                            id: 'notifyInvoiceSent', 
                            label: 'Invoice Creation Sent Alerts', 
                            desc: 'Automatically compose & dispatch invoice copies when saving new entries.', 
                            val: notifyInvoiceSent 
                          },
                          { 
                            id: 'notifyPaymentReceived', 
                            label: 'Payment Received Clearances', 
                            desc: 'Notify clients & administrators with custom confirmation ledger receipt upon status updates.', 
                            val: notifyPaymentReceived 
                          },
                          { 
                            id: 'notifyOverdueAlert', 
                            label: 'Overdue Automatic Reminders', 
                            desc: 'Engage background scheduler scanners to remind clients of impending invoice deadlines.', 
                            val: notifyOverdueAlert 
                          },
                          { 
                            id: 'notifyEmail', 
                            label: 'Consolidated Electronic Mail notifications', 
                            desc: 'Allow routing PDF copies to recipient client mailboxes directly.', 
                            val: notifyEmail 
                          },
                          { 
                            id: 'notifyWhatsapp', 
                            label: 'Whatsapp Business Messaging (Sandbox)', 
                            desc: 'Utilize instant API message delivery to customer contact numbers (requires credit authorization).', 
                            val: notifyWhatsapp 
                          }
                        ].map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-start justify-between p-4 bg-[#080a0f] border border-white/5 hover:border-indigo-500/20 rounded-xl transition"
                          >
                            <div className="space-y-1 pr-6">
                              <p className="text-xs font-bold text-white">{item.label}</p>
                              <p className="text-[10px] text-slate-500 leading-normal">{item.desc}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => triggerToggleInstantAndSave(item.id, item.val)}
                              className={`w-11 h-6 rounded-full transition-all relative shrink-0 cursor-pointer ${item.val ? 'bg-indigo-600' : 'bg-slate-800'}`}
                            >
                              <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${item.val ? 'left-6' : 'left-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-[#080a0f] border border-white/5 p-4 rounded-xl flex items-start gap-3">
                        <Info className="w-5 h-5 text-[#818cf8]" />
                        <div className="text-[10px] text-slate-500 leading-normal">
                          <p className="font-bold text-slate-300">Stripe Invoicing Event Polling</p>
                          <p className="mt-0.5">Automated reminders scan daily at 00:00 UTC. To config sandbox timers, use custom background trigger values in setting rules.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. TEAM COLLABORATION TAB */}
                {activeSettingsTab === 'team' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Form Column */}
                      <div className="lg:col-span-1 bg-[#10131e] border border-white/5 rounded-2xl p-6 space-y-4 self-start">
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Invite Team Member</h4>
                        <p className="text-[10px] text-slate-500">Grant custom roles & ledger edit clearance access.</p>

                        <form onSubmit={handleInviteTeamMember} className="space-y-4 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Full Member Name</label>
                            <input 
                              type="text" 
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              className="w-full bg-[#080a0f] border border-[#1d2232] rounded-xl px-3 py-2 text-white placeholder-slate-700 focus:outline-none"
                              placeholder="Rohan Sharma"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Email Coordinates *</label>
                            <input 
                              type="email" 
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="w-full bg-[#080a0f] border border-[#1d2232] rounded-xl px-3 py-2 text-white placeholder-slate-700 focus:outline-none"
                              placeholder="rohan@acme.co"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Assigned Role Tier</label>
                            <select 
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value as any)}
                              className="w-full bg-[#080a0f] border border-[#1d2232] rounded-xl px-2.5 py-2 text-white text-xs cursor-pointer"
                            >
                              <option value="Admin">Administrator (All Permissions)</option>
                              <option value="Accountant">Accountant (Invoices & Reports)</option>
                              <option value="Staff">Staff (View Only / Basic Entries)</option>
                            </select>
                          </div>

                          <button 
                            type="submit"
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Transmit Invite</span>
                          </button>
                        </form>
                      </div>

                      {/* Members List Table Column */}
                      <div className="lg:col-span-2 bg-[#10131e] border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Authorized Credentials matrix</h4>
                          <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded font-mono uppercase font-semibold">Nodes active: {teamMembers.length}</span>
                        </div>

                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-slate-500 font-mono text-[9px] uppercase tracking-wider border-b border-white/5">
                                <th className="pb-2.5">Member Identity</th>
                                <th className="pb-2.5">Assigned Role</th>
                                <th className="pb-2.5">Access status</th>
                                <th className="pb-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[11px] leading-relaxed">
                              {teamMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-white/2">
                                  <td className="py-3 pr-2">
                                    <p className="font-bold text-white leading-none">{member.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono leading-normal mt-0.5">{member.email}</p>
                                  </td>
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase font-mono ${
                                      member.role === 'Owner' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                      member.role === 'Admin' ? 'bg-violet-500/15 text-violet-400' :
                                      member.role === 'Accountant' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-400'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                                      member.status === 'Active' ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'
                                    }`} />
                                    <span className="text-slate-400">{member.status}</span>
                                  </td>
                                  <td className="py-3 text-right">
                                    {member.role !== 'Owner' && (
                                      <button 
                                        onClick={() => handleRemoveTeamMember(member.id)}
                                        className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition"
                                        title="Revoke Credentials"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>

                    {/* Permissions Matrix Checklist Table */}
                    <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3.5">
                        <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-white">Dynamic Permissions Matrix Workspace</h4>
                          <p className="text-[9px] text-slate-500">Configure client capabilities based on assigned credential roles.</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto text-[10px] font-mono text-slate-300">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500">
                              <th className="pb-2">Capability Module</th>
                              <th className="pb-2 text-center">Owner / Root</th>
                              <th className="pb-2 text-center">Admin Tier</th>
                              <th className="pb-2 text-center">Accountant</th>
                              <th className="pb-2 text-center">Staff Member</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {[
                              { label: 'Compile & Modify Invoices', caps: [true, true, true, false] },
                              { label: 'Register & Unregister Products', caps: [true, true, true, false] },
                              { label: 'Modify Company Payment Addresses', caps: [true, true, false, false] },
                              { label: 'Invite / Expel Collaborators', caps: [true, true, false, false] },
                              { label: 'Delete Historic Registers records', caps: [true, false, false, false] },
                              { label: 'Read Telemetry / Export PDF Reports', caps: [true, true, true, true] }
                            ].map((perm, idx) => (
                              <tr key={idx} className="hover:bg-white/2">
                                <td className="py-2.5 font-sans font-bold text-slate-200">{perm.label}</td>
                                <td className="py-2.5 text-center"><Check className="w-4 h-4 text-indigo-400 mx-auto" /></td>
                                <td className="py-2.5 text-center">{perm.caps[1] ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <div className="text-slate-700 inline">-</div>}</td>
                                <td className="py-2.5 text-center">{perm.caps[2] ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <div className="text-slate-700 inline">-</div>}</td>
                                <td className="py-2.5 text-center">{perm.caps[3] ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <div className="text-slate-700 inline">-</div>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. PRESERVED SERVICES INVENTORY TAB */}
                {activeSettingsTab === 'products' && (
                  <div className="space-y-6">
                    {/* Register Product Input builder */}
                    <form onSubmit={handleAddProduct} className="bg-[#10131e] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4.5">
                        <ShoppingBag className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-white text-sm">Register Service / Product Index</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Define pre-priced services or commodities to easily inject into invoicing logs.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Product Title / Service Label *</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Graphic Redesign Milestone 1"
                            value={prodName}
                            onChange={(e) => setProdName(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">Standard Rate Index (₹) *</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 5000"
                            value={prodRate || ''}
                            onChange={(e) => setProdRate(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 font-mono"
                            required
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">SLA / Technical Descriptions</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Core consulting service hours allocated for technical milestones"
                            value={prodDesc}
                            onChange={(e) => setProdDesc(e.target.value)}
                            className="w-full bg-[#080a0f] border border-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit"
                          disabled={addingProduct}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                        >
                          {addingProduct ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          <span>Record Index</span>
                        </button>
                      </div>
                    </form>

                    {/* Table Listings catalog */}
                    <div className="bg-[#10131e] border border-white/5 rounded-2xl p-6">
                      <h3 className="font-extrabold text-white text-sm mb-4">Priced Services Database catalogue</h3>

                      {products.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">No registered priced indices found. Use catalog builder above to register records.</div>
                      ) : (
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-mono border-b border-white/5">
                                <th className="pb-3 font-semibold">Service Label</th>
                                <th className="pb-3 font-semibold">Description</th>
                                <th className="pb-3 font-semibold text-right">Standard Rate Index</th>
                                <th className="pb-3"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {products.map((p) => (
                                <tr key={p.id} className="hover:bg-white/2">
                                  <td className="py-4 font-bold text-white pr-2">{p.name}</td>
                                  <td className="py-4 text-slate-400 max-w-xs truncate">{p.description || '--'}</td>
                                  <td className="py-4 text-right font-mono text-slate-200">₹ {p.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  <td className="py-4 text-right">
                                    <button 
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                      title="Unregister Product"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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

              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
