import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { 
  Printer, Download, Save, Mail, FilePlus2, RefreshCw, 
  History, X, CheckCircle, AlertCircle, Trash2,
  Key, Database, Phone, Globe, LogOut
} from 'lucide-react';
import elmenLogo from './assets/elmen-logo-white.png';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreview } from './components/InvoicePreview';
import { Login } from './components/Login';
import { InvoiceData } from './types/invoice';
import {
  generateInvoiceNumber,
  peekNextInvoiceNumber,
  saveInvoice,
  getAllInvoices,
  deleteInvoiceByNo,
  migrateFromLocalStorage
} from './db/invoiceDB';
import { COMPANY, INVOICE_NOTES, TERMS_AND_CONDITIONS } from './constants/company';

// Zod preprocessor to safely cast empty strings or NaN fields to 0
const numberPreprocessor = z.preprocess(
  (val) => (val === '' || val === undefined || val === null || isNaN(Number(val)) ? 0 : Number(val)),
  z.number().min(0)
);

const invoiceSchema = z.object({
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    gstin: z.string().min(1, 'GSTIN is required'),
    fssai: z.string().default(''),
    email: z.string().email('Invalid email').or(z.literal('')),
    phone: z.string().min(1, 'Phone number is required'),
    website: z.string().default(''),
    address: z.string().min(1, 'Company address is required'),
    logo: z.string().default('')
  }),
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    phone: z.string().default(''),
    email: z.string().email('Invalid customer email').or(z.literal('')),
    billingAddress: z.string().default(''),
    shippingAddress: z.string().default(''),
    gstin: z.string().optional()
  }),
  invoice: z.object({
    invoiceNo: z.string().min(1, 'Invoice number is required'),
    orderNo: z.string().default(''),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().optional(),
    paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Net Banking', 'COD']),
    paymentStatus: z.enum(['Paid', 'Pending', 'Partial'])
  }),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Product name is required'),
      variant: z.string().default(''),
      size: z.string().default(''),
      qty: z.preprocess(
        (val) => (val === '' || val === undefined || val === null || isNaN(Number(val)) ? 1 : Number(val)),
        z.number().min(1, 'Qty must be at least 1')
      ),
      unitPrice: numberPreprocessor,
      discount: numberPreprocessor,
      gstPercent: numberPreprocessor,
      total: numberPreprocessor
    })
  ).min(1, 'At least one line item is required'),
  summary: z.object({
    subtotal: z.number().default(0),
    discount: z.number().default(0),
    couponDiscount: numberPreprocessor,
    shippingCharges: numberPreprocessor,
    cgst: z.number().default(0),
    sgst: z.number().default(0),
    igst: z.number().default(0),
    roundOff: z.number().default(0),
    grandTotal: z.number().default(0),
    amountPaid: numberPreprocessor,
    balanceDue: z.number().default(0)
  }),
  notes: z.object({
    notes: z.string().default(''),
    terms: z.string().default(''),
    returnPolicy: z.string().default(''),
    specialInstructions: z.string().default('')
  })
});

// Default initial values — company is always hardcoded from constants
const getDefaultValues = (invoiceNo = 'EL-INV-LOADING'): InvoiceData => {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];

  const randomOrder = Math.floor(100000 + Math.random() * 900000);

  return {
    company: { ...COMPANY },
    customer: {
      name: '',
      phone: '',
      email: '',
      billingAddress: '',
      shippingAddress: '',
      gstin: ''
    },
    invoice: {
      invoiceNo,
      orderNo: `ORD-${randomOrder}`,
      invoiceDate: format(today),
      paymentMethod: 'UPI',
      paymentStatus: 'Pending'
    },
    items: [
      {
        id: 'init-item-1',
        name: '',
        variant: '',
        size: '',
        qty: 1,
        unitPrice: 0,
        discount: 0,
        gstPercent: 0,
        total: 0
      }
    ],
    summary: {
      subtotal: 0,
      discount: 0,
      couponDiscount: 0,
      shippingCharges: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      roundOff: 0,
      grandTotal: 0,
      amountPaid: 0,
      balanceDue: 0
    },
    notes: {
      notes: INVOICE_NOTES,
      terms: TERMS_AND_CONDITIONS,
      returnPolicy: 'Health supplements are non-returnable once the safety seal is broken.',
      specialInstructions: 'Store in a cool, dry place. Protect from heat and direct sunlight.'
    }
  };
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('elmen_auth') === 'true';
  });
  const [isIgst, setIsIgst] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<InvoiceData[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'records'>('create');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const methods = useForm<InvoiceData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: getDefaultValues()
  });

  const { handleSubmit, watch, reset, setValue } = methods;
  const watchData = watch();
  const watchInvoiceNo = watch('invoice.invoiceNo');
  const watchCustomerName = watch('customer.name');
  const watchCustomerEmail = watch('customer.email');

  // Extract unique customer records from all stored invoices to enable autofill
  const uniqueCustomers = Array.from(
    new Map(
      savedInvoices
        .filter(inv => inv.customer && inv.customer.name)
        .map(inv => [inv.customer.name.toLowerCase().trim(), inv.customer])
    ).values()
  );

  // Trigger brief Toast alert
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // On mount: migrate from localStorage → IndexedDB, load invoices, assign next invoice number
  useEffect(() => {
    const init = async () => {
      try {
        await migrateFromLocalStorage();
        const all = await getAllInvoices();
        setSavedInvoices(all);
        // Generate a unique invoice number for the new blank form
        const nextNo = await peekNextInvoiceNumber();
        setValue('invoice.invoiceNo', nextNo);
        setDbReady(true);
      } catch (err) {
        console.error('[App] DB init error:', err);
        triggerToast('Database initialization failed. Using temporary mode.', 'error');
        setDbReady(true);
      }
    };
    init();
  }, []);

  // Save Current Form as Invoice — uses IndexedDB
  const handleSaveInvoice = () => {
    const currentData = methods.getValues();
    
    methods.trigger().then(async (isValid) => {
      if (!isValid) {
        triggerToast('Please correct the validation errors in the form before saving.', 'error');
        return;
      }

      try {
        const isNew = !savedInvoices.find(i => i.invoice.invoiceNo === currentData.invoice.invoiceNo);

        // If new invoice, consume and increment the counter
        if (isNew) {
          const confirmedNo = await generateInvoiceNumber();
          currentData.invoice.invoiceNo = confirmedNo;
          setValue('invoice.invoiceNo', confirmedNo);
        }

        await saveInvoice(currentData);
        const all = await getAllInvoices();
        setSavedInvoices(all);

        if (isNew) {
          triggerToast(`Invoice ${currentData.invoice.invoiceNo} saved to database!`);
        } else {
          triggerToast(`Invoice ${currentData.invoice.invoiceNo} updated successfully!`);
        }
      } catch (err) {
        console.error(err);
        triggerToast('Failed to save invoice to database.', 'error');
      }
    });
  };

  // Keyboard shortcuts integration (Ctrl+S, Ctrl+P)
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSaveInvoice();
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          window.print();
        }
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [savedInvoices]);

  // Load saved invoice into form
  const loadInvoice = (invoice: InvoiceData) => {
    reset(invoice);
    setActiveTab('create');
    triggerToast(`Loaded invoice ${invoice.invoice.invoiceNo}`);
  };

  // Delete invoice from history — uses IndexedDB
  const deleteInvoice = async (invNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteInvoiceByNo(invNo);
      const all = await getAllInvoices();
      setSavedInvoices(all);
      triggerToast(`Invoice ${invNo} deleted.`, 'info');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to delete invoice.', 'error');
    }
  };

  // Duplicate current Invoice values — gets a fresh peeked invoice number
  const handleDuplicateInvoice = async () => {
    const currentData = methods.getValues();
    const today = new Date();
    const randomOrder = Math.floor(100000 + Math.random() * 900000);
    const nextNo = await peekNextInvoiceNumber();

    const duplicated: InvoiceData = {
      ...currentData,
      invoice: {
        ...currentData.invoice,
        invoiceNo: nextNo,
        orderNo: `ORD-${randomOrder}`,
        invoiceDate: today.toISOString().split('T')[0]
      }
    };

    reset(duplicated);
    triggerToast('Duplicated invoice. New sequential number assigned.', 'info');
  };

  // PDF Download using html2pdf.js dynamically
  const handleDownloadPDF = () => {
    methods.trigger().then((isValid) => {
      if (!isValid) {
        triggerToast('Please resolve validation errors before exporting.', 'error');
        return;
      }

      triggerToast('Generating PDF...', 'info');
      
      const wrapper = document.getElementById('pdf-invoice-wrapper');
      const invoiceElement = document.getElementById('invoice-printable');
      
      if (!wrapper || !invoiceElement) {
        triggerToast('Invoice element not found.', 'error');
        return;
      }

      // Temporarily reveal the hidden invoice for capture
      wrapper.style.display = 'block';
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';

      // Give browser time to finish laying out and rendering images in block display before html2canvas screenshot
      setTimeout(() => {
        const opt = {
          margin: 0,
          filename: `Invoice-${watchInvoiceNo || 'ELMEN'}.pdf`,
          image: { type: 'png' as const },
          html2canvas: { scale: 4, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          pagebreak: { mode: 'css' }
        };

        // @ts-ignore
        import('html2pdf.js').then((module) => {
          const html2pdf = module.default || module;
          html2pdf().from(invoiceElement).set(opt).save()
            .then(() => {
              triggerToast('PDF downloaded successfully!');
              wrapper.style.display = '';
              wrapper.style.position = '';
              wrapper.style.left = '';
              wrapper.style.top = '';
            })
            .catch(() => {
              triggerToast('PDF generation failed.', 'error');
              wrapper.style.display = '';
            });
        }).catch((err) => {
          console.error(err);
          triggerToast('Failed to load PDF library.', 'error');
          wrapper.style.display = '';
        });
      }, 150);
    });
  };

  // Clear all fields and reset to a fresh blank form with next unique invoice number
  const handleClearForm = async () => {
    const nextNo = await peekNextInvoiceNumber();
    const defaults = getDefaultValues(nextNo);
    reset(defaults);
    triggerToast('Form cleared. New invoice number assigned.', 'info');
  };

  // Email simulation trigger
  const handleEmailInvoice = () => {
    if (!watchCustomerEmail) {
      triggerToast('Please provide a customer email address first.', 'error');
      return;
    }
    setEmailModalOpen(true);
  };

  const confirmEmailSend = async () => {
    setIsEmailing(true);
    try {
      await axios.post('/api/invoices/send-email', {
        to: watchCustomerEmail,
        invoiceData: watchData
      });
      setIsEmailing(false);
      setEmailModalOpen(false);
      triggerToast(`Invoice successfully sent from elmenindia@gmail.com to ${watchCustomerEmail}!`);
    } catch (err: any) {
      console.error(err);
      setIsEmailing(false);
      triggerToast(err.response?.data?.error || 'Failed to send email.', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('elmen_auth');
    setIsAuthenticated(false);
    triggerToast('Logged out successfully.', 'info');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-elmen-black text-elmen-text selection:bg-elmen-orange selection:text-white pb-24">
      {/* ---------------- TOAST SYSTEM ---------------- */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-elmen-gray shadow-card animate-fade-in">
          {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500 shrink-0" />}
          {toast.type === 'info' && <History size={18} className="text-elmen-orange shrink-0" />}
          <span className="text-sm font-semibold text-elmen-text">{toast.message}</span>
        </div>
      )}

      {/* ---------------- EMAIL SIMULATION MODAL ---------------- */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-elmen-text/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-md w-full p-6 space-y-5 border border-elmen-gray">
            <div className="flex items-center justify-between pb-3 border-b border-elmen-gray">
              <h3 className="text-lg font-bold text-elmen-text flex items-center gap-2">
                <Mail size={18} className="text-elmen-orange" />
                Email Tax Invoice
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-elmen-muted hover:text-elmen-text">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-elmen-muted">
                You are about to email Invoice <span className="font-mono text-elmen-text font-bold">{watchInvoiceNo}</span> to <span className="text-elmen-text font-bold">{watchCustomerName || 'Walk-in'}</span>.
              </p>

              <div>
                <label className="glass-label">Sender Email</label>
                <input 
                  type="text" 
                  value="elmenindia@gmail.com" 
                  disabled
                  className="glass-input w-full text-sm font-mono opacity-70 bg-elmen-dark cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="glass-label">Recipient Email</label>
                <input 
                  type="email" 
                  value={watchCustomerEmail} 
                  onChange={(e) => setValue('customer.email', e.target.value)}
                  className="glass-input w-full text-sm font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-semibold transition-colors border border-elmen-gray"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={confirmEmailSend}
                disabled={isEmailing}
                className="flex items-center gap-1.5 px-4 py-2 bg-elmen-orange hover:bg-elmen-orange-hover text-white rounded-xl text-xs font-bold transition-all"
              >
                {isEmailing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- HEADER BAR ---------------- */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-elmen-gray py-2.5 px-6 md:px-10 flex items-center justify-between shadow-card">
        {/* Left Section: Logo & Brand details */}
        <div className="flex items-center gap-4 justify-start">
          {/* Real ELMEN logo */}
          <img
            src={elmenLogo}
            alt="Elmen Nutrition"
            className="h-10 w-auto object-contain shrink-0"
          />
          
          {/* Company details inline in header */}
          <div className="hidden xl:flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 border-l border-elmen-gray text-[10px] text-elmen-muted">
            <span className="font-semibold text-elmen-muted">{COMPANY.name}</span>
            <span className="h-2.5 w-px bg-elmen-gray" />
            <span className="flex items-center gap-1">
              <span className="font-semibold text-elmen-muted">GSTIN:</span> 
              <strong className="font-mono text-elmen-text">{COMPANY.gstin}</strong>
            </span>
            <span className="h-2.5 w-px bg-elmen-gray" />
            <span className="flex items-center gap-1">
              <span className="font-semibold text-elmen-muted">FSSAI:</span> 
              <strong className="font-mono text-elmen-text">{COMPANY.fssai}</strong>
            </span>
            <span className="h-2.5 w-px bg-elmen-gray" />
            <span className="flex items-center gap-1">
              <Phone size={11} className="text-elmen-orange" /> 
              <span className="text-elmen-text font-medium">{COMPANY.phone}</span>
            </span>
            <span className="h-2.5 w-px bg-elmen-gray" />
            <span className="flex items-center gap-1">
              <Mail size={11} className="text-elmen-orange" /> 
              <span className="text-elmen-text font-medium">{COMPANY.email}</span>
            </span>
            <span className="h-2.5 w-px bg-elmen-gray" />
            <span className="flex items-center gap-1">
              <Globe size={11} className="text-elmen-orange" /> 
              <a href={`https://${COMPANY.website}`} target="_blank" rel="noreferrer" className="text-elmen-orange hover:underline font-semibold">{COMPANY.website}</a>
            </span>
          </div>
        </div>

        {/* Right Section: Actions & Logout */}
        <div className="flex items-center justify-end gap-3">
          {activeTab === 'create' && (
            <>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-bold border border-elmen-gray transition-colors"
              >
                <Download size={14} className="text-elmen-muted" />
                Download PDF
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-elmen-orange hover:bg-elmen-orange-hover text-white rounded-xl text-xs font-black shadow-premium-glow transition-all duration-200"
              >
                <Printer size={15} />
                Print Invoice
              </button>

              <span className="h-6 w-px bg-elmen-gray hidden sm:inline" />
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200/50 transition-colors"
            title="Log out of admin session"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ---------------- NAVIGATION TABS (BELOW HEADER) ---------------- */}
      <div className="no-print max-w-7xl mx-auto px-4 md:px-8 mt-6 flex justify-center">
        <div className="inline-flex items-center bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-elmen-gray shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-elmen-orange text-white shadow-premium-glow'
                : 'text-elmen-muted hover:text-elmen-text'
            }`}
          >
            <FilePlus2 size={13} />
            <span>Create Bill</span>
          </button>
          
          <button
            type="button"
            onClick={async () => {
              try {
                const all = await getAllInvoices();
                setSavedInvoices(all);
              } catch (err) {
                console.error(err);
              }
              setActiveTab('records');
            }}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'records'
                ? 'bg-elmen-orange text-white shadow-premium-glow'
                : 'text-elmen-muted hover:text-elmen-text'
            }`}
          >
            <Database size={13} />
            <span>View Records ({savedInvoices.length})</span>
          </button>
        </div>
      </div>

      {/* ---------------- MAIN LAYOUT (full width, premium dashboard style) ---------------- */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 pb-8">
        
        {activeTab === 'records' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-elmen-gray pb-4">
              <div>
                <h2 className="text-lg font-bold tracking-wide text-elmen-text">Stored Invoice Repository</h2>
                <p className="text-xs text-elmen-muted">Synchronized in real-time with MongoDB cloud database</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const all = await getAllInvoices();
                    setSavedInvoices(all);
                    triggerToast('Refreshed database records.', 'info');
                  } catch (err) {
                    console.error(err);
                    triggerToast('Failed to refresh records.', 'error');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-semibold border border-elmen-gray transition-colors"
              >
                <RefreshCw size={13} className="text-elmen-muted" />
                Reload
              </button>
            </div>

            {savedInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-elmen-gray text-elmen-muted font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-4">Invoice No</th>
                      <th className="py-4 px-4">Date</th>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Payment</th>
                      <th className="py-4 px-4 text-right">Amount</th>
                      <th className="py-4 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-elmen-gray/60 text-elmen-text">
                    {savedInvoices.map((inv) => (
                      <tr key={inv.invoice.invoiceNo} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-xs">{inv.invoice.invoiceNo}</td>
                        <td className="py-4 px-4 text-xs text-elmen-muted">{inv.invoice.invoiceDate}</td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-xs">{inv.customer.name || 'Walk-in client'}</div>
                          <div className="text-[10px] text-elmen-muted mt-0.5">{inv.customer.phone || 'No phone'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-medium">{inv.invoice.paymentMethod}</span>
                          <span className={`inline-block ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            inv.invoice.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : inv.invoice.paymentStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {inv.invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-elmen-orange">
                          ₹{inv.summary.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadInvoice(inv)}
                              className="px-3 py-1.5 bg-elmen-orange/10 hover:bg-elmen-orange text-elmen-orange hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Load &amp; Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteInvoice(inv.invoice.invoiceNo, e)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg border border-rose-100 hover:border-rose-500 transition-all"
                              title="Delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 space-y-4 text-elmen-muted border border-dashed border-elmen-gray rounded-2xl">
                <Database size={44} className="mx-auto text-elmen-gray" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">No records stored in the database yet</p>
                  <p className="text-xs text-elmen-gray">Click "Create Bill" and click "Save to DB" to store invoice logs</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-print">
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(handleSaveInvoice)} className="space-y-6">
                <InvoiceForm isIgst={isIgst} setIsIgst={setIsIgst} customers={uniqueCustomers} onShowHistory={async () => {
                  try {
                    const all = await getAllInvoices();
                    setSavedInvoices(all);
                  } catch (err) {
                    console.error(err);
                  }
                  setActiveTab('records');
                }} />
              </form>
            </FormProvider>
          </div>
        )}

        {/* Hidden Invoice Sheet — only visible when printing or generating PDF */}
        <div className="hidden" id="pdf-invoice-wrapper">
          <InvoicePreview data={watchData as InvoiceData} isIgst={isIgst} />
        </div>
      </main>

      {/* ---------------- BOTTOM ACTIONS FLOATING BAR ---------------- */}
      {activeTab === 'create' && (
        <div className="fixed bottom-0 left-0 right-0 py-4 bg-white/90 backdrop-blur-md border-t border-elmen-gray shadow-card z-40 no-print">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-semibold border border-elmen-gray transition-colors"
              >
                <RefreshCw size={13} className="text-elmen-muted" />
                Clear Form
              </button>
              <button
                type="button"
                onClick={handleDuplicateInvoice}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-semibold border border-elmen-gray transition-colors"
              >
                <FilePlus2 size={13} className="text-elmen-muted" />
                Duplicate Invoice
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEmailInvoice}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-elmen-dark hover:bg-elmen-lightgray text-elmen-text rounded-xl text-xs font-semibold border border-elmen-gray transition-colors"
              >
                <Mail size={14} className="text-elmen-muted" />
                Email Invoice
              </button>

              <button
                type="button"
                onClick={handleSaveInvoice}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-elmen-orange hover:bg-elmen-orange-hover text-white rounded-xl text-xs font-bold shadow-premium-glow transition-all duration-200"
              >
                <Save size={14} className="text-white" />
                Save to DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
