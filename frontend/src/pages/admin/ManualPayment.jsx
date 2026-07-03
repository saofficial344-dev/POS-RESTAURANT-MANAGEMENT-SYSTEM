import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Upload, CheckCircle, Clock, XCircle, AlertCircle,
  ArrowLeft, Image, FileText, RefreshCw, ZoomIn, Download,
} from 'lucide-react';

const fmtRs   = n => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_CLS = {
  pending_review: 'text-amber-700  bg-amber-50  border-amber-200',
  approved:       'text-green-700  bg-green-50  border-green-200',
  rejected:       'text-red-700    bg-red-50    border-red-200',
  cancelled:      'text-gray-500   bg-gray-100  border-gray-200',
};
const STATUS_LABELS = {
  pending_review: 'Under Review',
  approved:       'Approved',
  rejected:       'Rejected',
  cancelled:      'Cancelled',
};

// ── Receipt Zoom Modal ────────────────────────────────────────────────────────
const ReceiptZoomModal = ({ src, onClose }) => {
  const isBase64 = src?.startsWith('data:');

  const handleDownload = () => {
    if (isBase64) {
      const a = document.createElement('a');
      a.href = src;
      a.download = `receipt-${Date.now()}.png`;
      a.click();
    } else {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); handleDownload(); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all"
        >
          <Download size={13} /> Download
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all"
        >
          Close ✕
        </button>
      </div>
      <img
        src={src}
        alt="Receipt full view"
        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};

const ManualPayment = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const fileRef   = useRef(null);

  const preSelectedInvoiceId = location.state?.invoiceId || null;

  const [invoices,    setInvoices]    = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [loadingInv,  setLoadingInv]  = useState(true);
  const [loadingPay,  setLoadingPay]  = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [receiptType,     setReceiptType]      = useState('screenshot');
  const [receiptUrl,      setReceiptUrl]       = useState('');
  const [receiptPreview,  setReceiptPreview]   = useState('');
  const [referenceNumber, setReferenceNumber]  = useState('');
  const [notes,           setNotes]            = useState('');
  const [submitting,      setSubmitting]       = useState(false);

  const [zoomedReceipt, setZoomedReceipt] = useState(null);

  const loadData = async () => {
    setLoadingInv(true);
    setLoadingPay(true);
    try {
      const [invRes, payRes] = await Promise.all([
        api.get('/subscription/invoices?page=1&limit=20'),
        api.get('/payments?page=1&limit=20'),
      ]);
      const openInvoices = (invRes.data.data || []).filter(i => i.status === 'open');
      setInvoices(openInvoices);
      setPayments(payRes.data.data || []);

      if (preSelectedInvoiceId) {
        const match = (invRes.data.data || []).find(i => i._id === preSelectedInvoiceId);
        if (match) setSelectedInvoice(match);
      }
    } catch {
      toast.error('Failed to load payment data');
    } finally {
      setLoadingInv(false);
      setLoadingPay(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5 MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Only image files are accepted'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setReceiptUrl(base64);
      setReceiptPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) { toast.error('Select an invoice to pay'); return; }
    if (!receiptUrl.trim()) { toast.error('Upload a receipt or paste a URL'); return; }

    setSubmitting(true);
    try {
      await api.post('/payments', {
        invoiceId:      selectedInvoice._id,
        receiptUrl,
        receiptType,
        referenceNumber: referenceNumber.trim(),
        submitterNotes:  notes,
      });
      toast.success('Payment submitted! We will review it and notify you within 24 hours.');
      setSelectedInvoice(null);
      setReceiptUrl('');
      setReceiptPreview('');
      setReferenceNumber('');
      setNotes('');
      if (fileRef.current) fileRef.current.value = '';
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (paymentId) => {
    if (!window.confirm('Cancel this payment submission?')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success('Payment submission cancelled');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleReceiptDownload = (src) => {
    if (!src) return;
    if (src.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = src;
      a.download = `receipt-${Date.now()}.png`;
      a.click();
    } else {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  const hasPending = payments.some(p => p.status === 'pending_review');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Receipt zoom modal */}
      {zoomedReceipt && <ReceiptZoomModal src={zoomedReceipt} onClose={() => setZoomedReceipt(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Submit Payment</h2>
          <p className="text-sm text-gray-500 mt-1">Upload your payment receipt for review</p>
        </div>
        <button onClick={loadData} className="ml-auto p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Pending review alert */}
      {hasPending && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <Clock size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Payment Under Review</p>
            <p className="text-xs text-amber-600">You have a payment submission currently under review. You will be notified once approved.</p>
          </div>
        </div>
      )}

      {/* Payment submission form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-5">New Payment Submission</h3>

        {/* Invoice selection */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Invoice to Pay</label>
          {loadingInv ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : invoices.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <CheckCircle size={16} className="text-green-500" />
              No unpaid invoices. All good!
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => {
                const isSelected = selectedInvoice?._id === inv._id;
                const isOverdue  = inv.dueDate && new Date(inv.dueDate) < new Date();
                return (
                  <label
                    key={inv._id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="invoice"
                      checked={isSelected}
                      onChange={() => setSelectedInvoice(inv)}
                      className="accent-indigo-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{inv.planId?.displayName || 'Subscription'} Plan</p>
                        <span className="text-[10px] font-mono text-gray-400">{inv.invoiceNumber}</span>
                        {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">OVERDUE</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(inv.dueDate)}</p>
                    </div>
                    <p className="text-base font-black text-gray-900 shrink-0">{fmtRs(inv.total)}</p>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Receipt type */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Type</label>
          <div className="flex gap-3">
            {[
              { value: 'screenshot',    label: 'App Screenshot',   icon: Image },
              { value: 'bank_transfer', label: 'Bank Transfer',    icon: FileText },
              { value: 'other',         label: 'Other',            icon: FileText },
            ].map(({ value, label, icon: Icon }) => (
              <label key={value} className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                receiptType === value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="receiptType"
                  value={value}
                  checked={receiptType === value}
                  onChange={() => setReceiptType(value)}
                  className="accent-indigo-600"
                />
                <Icon size={14} className="text-gray-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Receipt upload */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Receipt</label>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-all group"
          >
            {receiptPreview ? (
              <div className="relative">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-48 mx-auto rounded-lg object-contain cursor-zoom-in"
                  onClick={e => { e.stopPropagation(); setZoomedReceipt(receiptPreview); }}
                />
                <div className="flex gap-2 justify-center mt-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setZoomedReceipt(receiptPreview); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition-all"
                  >
                    <ZoomIn size={12} /> Zoom
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleReceiptDownload(receiptPreview); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition-all"
                  >
                    <Download size={12} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setReceiptUrl(''); setReceiptPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs text-red-500 transition-all"
                  >
                    <XCircle size={12} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={28} className="group-hover:text-indigo-400 transition-colors" />
                <p className="text-sm font-medium">Click to upload receipt image</p>
                <p className="text-xs">PNG, JPG, JPEG up to 5 MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <div className="mt-3">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Or paste image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={receiptUrl.startsWith('data:') ? '' : receiptUrl}
              onChange={e => { setReceiptUrl(e.target.value); setReceiptPreview(e.target.value); }}
              className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
            />
          </div>
        </div>

        {/* Reference Number */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Reference Number <span className="font-normal normal-case text-gray-400">(Transaction ID / Cheque No.)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. TXN-123456789 or CHQ-2024-001"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Additional Notes (Optional)</label>
          <textarea
            rows={2}
            placeholder="Any additional information for the reviewer..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedInvoice || !receiptUrl}
          className="w-full h-12 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><RefreshCw size={16} className="animate-spin" /> Submitting…</>
          ) : (
            <><Upload size={16} /> Submit Payment for Review</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Payment reviews typically take 1–24 hours. You will receive a notification once processed.
        </p>
      </form>

      {/* Payment history */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-4">Payment History</h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p._id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      p.status === 'approved'       ? 'bg-green-100' :
                      p.status === 'rejected'       ? 'bg-red-100'   :
                      p.status === 'pending_review' ? 'bg-amber-100' :
                      'bg-gray-100'
                    }`}>
                      {p.status === 'approved'       ? <CheckCircle size={16} className="text-green-600" /> :
                       p.status === 'rejected'       ? <XCircle     size={16} className="text-red-500"   /> :
                       p.status === 'pending_review' ? <Clock       size={16} className="text-amber-600" /> :
                                                       <AlertCircle size={16} className="text-gray-400"  />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {p.invoiceId?.invoiceNumber || 'Manual Payment'}
                        <span className="text-gray-400 ml-2 font-normal capitalize">{p.receiptType?.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-gray-400">{fmtDate(p.createdAt)}</p>
                      {p.referenceNumber && (
                        <p className="text-xs text-indigo-600 mt-0.5 font-mono">Ref: {p.referenceNumber}</p>
                      )}
                      {p.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">{p.rejectionReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Receipt quick actions */}
                    {p.receiptUrl && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setZoomedReceipt(p.receiptUrl)}
                          className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View receipt"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          onClick={() => handleReceiptDownload(p.receiptUrl)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Download receipt"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{fmtRs(p.amount)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_CLS[p.status] || 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                    {p.status === 'pending_review' && (
                      <button
                        onClick={() => handleCancel(p._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Cancel submission"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualPayment;
