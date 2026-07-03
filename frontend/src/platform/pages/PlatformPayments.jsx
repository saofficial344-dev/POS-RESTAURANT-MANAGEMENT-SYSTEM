import { useState, useEffect, useCallback } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Clock, CreditCard, X, AlertCircle, Eye, RotateCcw,
  ZoomIn, Download, Search, FileDown,
} from 'lucide-react';

const STATUS_CLS = {
  pending_review: 'text-amber-400 bg-amber-400/10  border-amber-400/30',
  approved:       'text-green-400 bg-green-400/10  border-green-400/30',
  rejected:       'text-red-400   bg-red-400/10    border-red-400/30',
  cancelled:      'text-gray-500  bg-gray-700      border-transparent',
  succeeded:      'text-green-400 bg-green-400/10  border-green-400/30',
  failed:         'text-red-400   bg-red-400/10    border-red-400/30',
};

const STATUS_LABELS = {
  pending_review: 'Under Review',
  approved:       'Approved',
  rejected:       'Rejected',
  cancelled:      'Cancelled',
  succeeded:      'Succeeded',
  failed:         'Failed',
};

const fmtRs   = n => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Receipt zoom overlay ───────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4" onClick={onClose}>
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

// ── Payment detail panel (right slide-over) ────────────────────────────────────
const PaymentPanel = ({ payment, onClose, onRefresh }) => {
  const [actionMode,    setActionMode]   = useState(null);
  const [input,         setInput]        = useState('');
  const [acting,        setActing]       = useState(false);
  const [imgError,      setImgError]     = useState(false);
  const [zoomedReceipt, setZoomedReceipt] = useState(null);

  const isPending = payment.status === 'pending_review';

  const handleApprove = async () => {
    setActing(true);
    try {
      await platformAPI.patch(`/payments/${payment._id}/approve`);
      toast.success('Payment approved. Subscription is now active.');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!input.trim()) { toast.error('Reason is required'); return; }
    setActing(true);
    try {
      await platformAPI.patch(`/payments/${payment._id}/reject`, { reason: input.trim() });
      toast.success('Payment rejected');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActing(false);
    }
  };

  const handleResubmit = async () => {
    if (!input.trim()) { toast.error('Instructions are required'); return; }
    setActing(true);
    try {
      await platformAPI.patch(`/payments/${payment._id}/request-resubmission`, { note: input.trim() });
      toast.success('Resubmission requested');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setActing(false);
    }
  };

  const handleReceiptDownload = () => {
    const src = payment.receiptUrl;
    if (!src) return;
    if (src.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = src;
      a.download = `receipt-${payment._id}.png`;
      a.click();
    } else {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      {zoomedReceipt && <ReceiptZoomModal src={zoomedReceipt} onClose={() => setZoomedReceipt(null)} />}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
        <div
          className="w-full max-w-lg h-full bg-gray-900 border-l border-gray-700/50 overflow-y-auto shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700/50 shrink-0">
            <div>
              <h3 className="font-bold text-white text-sm">Payment Review</h3>
              <p className="text-xs text-gray-500 mt-0.5">{payment.restaurantId?.name || 'Unknown'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {/* Status badge */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_CLS[payment.status] || ''}`}>
                {STATUS_LABELS[payment.status] || payment.status}
              </span>
              <span className="text-xs text-gray-500">{fmtDate(payment.createdAt)}</span>
            </div>

            {/* Receipt image */}
            {payment.receiptUrl && !imgError ? (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Receipt</p>
                <div
                  className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 cursor-zoom-in relative group"
                  onClick={() => setZoomedReceipt(payment.receiptUrl)}
                >
                  <img
                    src={payment.receiptUrl}
                    alt="Payment receipt"
                    className="w-full object-contain max-h-72"
                    onError={() => setImgError(true)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                    <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-600 capitalize">
                    Type: {payment.receiptType?.replace('_', ' ') || 'screenshot'}
                    {payment.createdAt && (
                      <span className="ml-2 text-gray-700">· Uploaded {fmtDate(payment.createdAt)}</span>
                    )}
                  </p>
                  <button
                    onClick={handleReceiptDownload}
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-all"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
            ) : payment.receiptUrl ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Receipt URL</p>
                <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline break-all">
                  {payment.receiptUrl}
                </a>
                <button
                  onClick={handleReceiptDownload}
                  className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-all"
                >
                  <Download size={11} /> Open in new tab
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-800/40 rounded-xl px-4 py-3 text-xs text-gray-500">
                <AlertCircle size={13} /> No receipt attached
              </div>
            )}

            {/* Restaurant + Invoice */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Restaurant</p>
                <p className="text-sm font-semibold text-white">{payment.restaurantId?.name || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{payment.restaurantId?.email || ''}</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">@{payment.restaurantId?.slug}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice</p>
                <p className="text-sm font-semibold text-white">{fmtRs(payment.amount)}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{payment.invoiceId?.invoiceNumber || '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Due {fmtDate(payment.invoiceId?.dueDate)}</p>
              </div>
            </div>

            {/* Submitted by */}
            {payment.submittedBy && (
              <div className="bg-gray-800/30 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Submitted By</p>
                <p className="text-xs text-gray-300">{payment.submittedBy?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{payment.submittedBy?.email || ''}</p>
                {payment.createdAt && (
                  <p className="text-[10px] text-gray-600 mt-1">at {fmtDate(payment.createdAt)}</p>
                )}
              </div>
            )}

            {/* Reference number */}
            {payment.referenceNumber && (
              <div className="bg-gray-800/30 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference Number</p>
                <p className="text-xs text-indigo-400 font-mono">{payment.referenceNumber}</p>
              </div>
            )}

            {/* Submitter notes */}
            {payment.submitterNotes && (
              <div className="bg-gray-800/30 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes from Restaurant</p>
                <p className="text-xs text-gray-300 leading-relaxed">{payment.submitterNotes}</p>
              </div>
            )}

            {/* Approval / rejection info */}
            {payment.status === 'approved' && (
              <div className="flex items-start gap-3 bg-green-400/5 border border-green-400/20 rounded-xl px-4 py-3">
                <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-400">Approved by {payment.approvedBy || 'admin'}</p>
                  <p className="text-[10px] text-gray-500">{fmtDate(payment.approvedAt)}</p>
                </div>
              </div>
            )}

            {payment.status === 'rejected' && (
              <div className="flex items-start gap-3 bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
                <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-400">Rejected by {payment.rejectedBy || 'admin'}</p>
                  {payment.rejectionReason && <p className="text-xs text-gray-400 mt-1">{payment.rejectionReason}</p>}
                  <p className="text-[10px] text-gray-500 mt-1">{fmtDate(payment.rejectedAt)}</p>
                </div>
              </div>
            )}

            {/* Action section — only for pending_review */}
            {isPending && (
              <div className="border-t border-gray-700/50 pt-5">
                {actionMode === null ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Actions</p>
                    <button
                      onClick={handleApprove}
                      disabled={acting}
                      className="w-full h-11 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {acting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approve Payment
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setActionMode('reject'); setInput(''); }}
                        className="h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                      <button
                        onClick={() => { setActionMode('resubmit'); setInput(''); }}
                        className="h-10 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw size={13} /> Resubmit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {actionMode === 'reject' ? <XCircle size={14} className="text-red-400" /> : <RotateCcw size={14} className="text-amber-400" />}
                      <p className="text-sm font-bold text-white">
                        {actionMode === 'reject' ? 'Reject Payment' : 'Request Resubmission'}
                      </p>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={actionMode === 'reject'
                        ? 'Reason for rejection (required)…'
                        : 'Instructions for the restaurant (required)…'}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-none placeholder:text-gray-600"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={actionMode === 'reject' ? handleReject : handleResubmit}
                        disabled={acting || !input.trim()}
                        className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                          actionMode === 'reject'
                            ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                            : 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                        }`}
                      >
                        {acting ? <RefreshCw size={12} className="animate-spin" /> : null}
                        {actionMode === 'reject' ? 'Confirm Reject' : 'Send Request'}
                      </button>
                      <button
                        onClick={() => setActionMode(null)}
                        className="h-10 px-4 rounded-xl text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const PlatformPayments = () => {
  const [payments,     setPayments]    = useState([]);
  const [stats,        setStats]       = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [exporting,    setExporting]   = useState(false);
  const [statusFilter, setStatus]      = useState('pending_review');
  const [search,       setSearch]      = useState('');
  const [page,         setPage]        = useState(1);
  const [pagination,   setPag]         = useState({ total: 0, pages: 1 });
  const [selected,     setSelected]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const [pRes, sRes] = await Promise.all([
        platformAPI.get(`/payments?${p}`),
        platformAPI.get('/payments/stats'),
      ]);
      setPayments(pRes.data.data || []);
      setPag(pRes.data.pagination || { total: 0, pages: 1 });
      setStats(sRes.data.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const res = await platformAPI.get(`/payments/export?${p}`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (payment) => {
    setSelected(payment);
    try {
      const res = await platformAPI.get(`/payments/${payment._id}`);
      setSelected(res.data.data);
    } catch { /* use list data */ }
  };

  const inputCls = 'h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {selected && (
        <PaymentPanel
          payment={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Payments</h2>
          <p className="text-xs text-gray-600 mt-1">Review and approve manual payment submissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 h-9 px-4 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          >
            {exporting ? <RefreshCw size={13} className="animate-spin" /> : <FileDown size={13} />}
            Export CSV
          </button>
          <button onClick={load} disabled={loading} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Pending Review',    value: stats.pendingCount,  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
            { label: 'Approved Today',    value: stats.approvedToday, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
            { label: 'Rejected Today',    value: stats.rejectedToday, color: 'text-red-400',    bg: 'bg-red-400/10   border-red-400/20'   },
            { label: 'Total Approved',    value: stats.totalApproved, color: 'text-indigo-400', bg: 'bg-gray-800/50  border-gray-700/50'   },
            { label: 'Revenue Collected', value: fmtRs(stats.totalAmount), color: 'text-white', bg: 'bg-gray-800/50  border-gray-700/50'   },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending alert */}
      {stats?.pendingCount > 0 && statusFilter !== 'pending_review' && (
        <div className="flex items-center justify-between bg-amber-400/5 border border-amber-400/20 rounded-xl px-5 py-3 mb-5">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">{stats.pendingCount} payment{stats.pendingCount !== 1 ? 's' : ''} awaiting review</span>
          </div>
          <button
            onClick={() => { setStatus('pending_review'); setPage(1); }}
            className="text-xs font-bold text-amber-400 hover:underline"
          >
            Show pending →
          </button>
        </div>
      )}

      {/* Filters + Search */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by restaurant name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputCls} pl-8 w-60`}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Payments</option>
          <option value="pending_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="succeeded">Succeeded</option>
        </select>
        <button type="submit" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all">
          Search
        </button>
        {(statusFilter || search) && (
          <button
            type="button"
            onClick={() => { setStatus('pending_review'); setSearch(''); setPage(1); }}
            className="h-9 px-3 text-sm text-gray-600 hover:text-gray-300"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-600 self-center">{pagination.total} result{pagination.total !== 1 ? 's' : ''}</span>
      </form>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <CreditCard size={32} className="mb-3 text-gray-700" />
            <p className="text-sm">No payments found</p>
            {statusFilter === 'pending_review' && <p className="text-xs text-gray-700 mt-1">All caught up!</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Restaurant','Invoice #','Amount','Type','Submitted By','Date','Status',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {payments.map(p => (
                  <tr key={p._id} className="hover:bg-gray-700/20 transition-colors cursor-pointer" onClick={() => openDetail(p)}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-white text-sm">{p.restaurantId?.name || '—'}</p>
                      <p className="text-[10px] text-gray-600 font-mono">@{p.restaurantId?.slug}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{p.invoiceId?.invoiceNumber || '—'}</td>
                    <td className="px-5 py-4 font-bold text-white text-xs">{fmtRs(p.amount)}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 capitalize">{p.receiptType?.replace('_',' ') || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{p.submittedBy?.name || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[p.status] || ''}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); openDetail(p); }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                        title="Review payment"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlatformPayments;
