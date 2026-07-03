import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Receipt, CheckCircle, Clock,
  XCircle, AlertCircle, Download, Eye, CreditCard, RefreshCw,
  Search, X as XIcon,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CLS = {
  draft:         'text-gray-500   bg-gray-100  border-gray-200',
  open:          'text-amber-700  bg-amber-50  border-amber-200',
  paid:          'text-green-700  bg-green-50  border-green-200',
  void:          'text-gray-400   bg-gray-100  border-gray-200',
  uncollectible: 'text-red-600    bg-red-50    border-red-200',
  cancelled:     'text-gray-500   bg-gray-100  border-gray-200',
  refunded:      'text-purple-700 bg-purple-50 border-purple-200',
};
const STATUS_ICON  = { paid: CheckCircle, open: Clock, void: XCircle, draft: Clock, uncollectible: AlertCircle, cancelled: XCircle, refunded: RefreshCw };
const STATUS_OPTS  = ['draft', 'open', 'paid', 'void', 'uncollectible', 'cancelled', 'refunded'];
const STATUS_LABEL = { draft: 'Draft', open: 'Open', paid: 'Paid', void: 'Void', uncollectible: 'Uncollectible', cancelled: 'Cancelled', refunded: 'Refunded' };

const TYPE_LABEL = {
  new_subscription:  'New',
  upgrade:           'Upgrade',
  downgrade:         'Downgrade',
  renewal:           'Renewal',
  reactivation:      'Reactivation',
  trial_conversion:  'Trial → Paid',
  platform_created:  'Platform',
  manual:            '',
};

const fmtRs   = n => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Invoice Detail Modal ───────────────────────────────────────────────────────
const InvoiceModal = ({ invoiceId, onClose, onPay }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/subscription/invoices/${invoiceId}`)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const printInvoice = () => {
    const inv = data?.invoice;
    if (!inv) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Invoice ${inv.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;padding:40px;color:#111}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .brand{font-size:24px;font-weight:900}
  .brand-sub{font-size:11px;color:#888;margin-top:2px}
  .inv-meta{text-align:right}
  .inv-num{font-size:20px;font-weight:800;color:#4F46E5}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;margin-top:6px}
  .badge-paid{background:#D1FAE5;color:#065F46}
  .badge-open{background:#FEF3C7;color:#92400E}
  .section{margin-bottom:32px}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:10px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{text-align:left;padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#888;border-bottom:2px solid #eee}
  td{padding:12px;font-size:13px;border-bottom:1px solid #f0f0f0}
  .total-row{display:flex;justify-content:space-between;padding:8px 12px;font-size:14px}
  .total-row.grand{font-size:18px;font-weight:900;background:#F9FAFB;border-radius:8px;padding:14px 12px;margin-top:8px}
  .footer{margin-top:48px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:24px}
</style>
</head><body>
<div class="header">
  <div><div class="brand">Restaurant POS</div><div class="brand-sub">Subscription Invoice</div></div>
  <div class="inv-meta">
    <div class="inv-num">${inv.invoiceNumber}</div>
    <div class="badge badge-${inv.status === 'paid' ? 'paid' : 'open'}">${inv.status.toUpperCase()}</div>
  </div>
</div>
<div class="section">
  <div class="section-title">Bill To</div>
  <strong>${inv.restaurantId?.name || user?.restaurant?.name || 'Restaurant'}</strong>
</div>
<div class="section">
  <div class="info-grid">
    <div><div class="section-title">Invoice Date</div><strong>${fmtDate(inv.createdAt)}</strong></div>
    <div><div class="section-title">Due Date</div><strong>${fmtDate(inv.dueDate)}</strong></div>
    ${inv.paidAt ? `<div><div class="section-title">Paid On</div><strong style="color:#065F46">${fmtDate(inv.paidAt)}</strong></div>` : ''}
    <div><div class="section-title">Billing Period</div><strong>${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}</strong></div>
    <div><div class="section-title">Plan</div><strong>${inv.planId?.displayName || '—'}</strong></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Line Items</div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${(inv.lineItems || []).map(li => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${fmtRs(li.unitPrice)}</td><td style="text-align:right">${fmtRs(li.amount)}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
<div>
  <div class="total-row"><span>Subtotal</span><span>${fmtRs(inv.subtotal)}</span></div>
  ${inv.tax > 0 ? `<div class="total-row"><span>Tax</span><span>${fmtRs(inv.tax)}</span></div>` : ''}
  <div class="total-row grand"><span>Total Due</span><span>${fmtRs(inv.total)} ${inv.currency}</span></div>
</div>
<div class="footer"><p>Thank you for your business.</p></div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`);
    win.document.close();
  };

  const inv      = data?.invoice;
  const payments = data?.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">{loading ? 'Loading…' : (inv?.invoiceNumber || 'Invoice')}</h3>
            {inv && <p className="text-xs text-gray-400 mt-0.5">{fmtDate(inv.createdAt)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {inv?.status === 'open' && (
              <button onClick={() => { onClose(); onPay(inv._id); }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all">
                Pay Now
              </button>
            )}
            <button onClick={printInvoice} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="Print / Download PDF">
              <Download size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading invoice…</div>
        ) : !inv ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Invoice not found</div>
        ) : (
          <div className="overflow-y-auto max-h-[70vh]">
            <div className="p-6 space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Status',       value: inv.status.toUpperCase(), cls: STATUS_CLS[inv.status] },
                  { label: 'Type',         value: TYPE_LABEL[inv.invoiceType] || inv.invoiceType?.replace(/_/g, ' ') || '—', capitalize: true },
                  { label: 'Plan',         value: inv.planId?.displayName || '—' },
                  { label: 'Billing',      value: inv.subscriptionId?.billingCycle || 'monthly', capitalize: true },
                  { label: 'Issue Date',   value: fmtDate(inv.createdAt) },
                  { label: 'Due Date',     value: fmtDate(inv.dueDate) },
                  { label: 'Paid On',      value: inv.paidAt ? fmtDate(inv.paidAt) : '—' },
                ].map(({ label, value, cls, capitalize }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    {cls
                      ? <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{value}</span>
                      : <p className={`text-sm font-semibold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>}
                  </div>
                ))}
              </div>

              {/* Billing period */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Period</p>
                <p className="text-sm text-gray-700">{fmtDate(inv.billingPeriodStart)} — {fmtDate(inv.billingPeriodEnd)}</p>
              </div>

              {/* Line items */}
              {inv.lineItems?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Line Items</p>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {inv.lineItems.map((li, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-3 text-sm">
                        <span className="text-gray-700">{li.description}</span>
                        <span className="font-bold text-gray-900">{fmtRs(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">{fmtRs(inv.subtotal)}</span></div>
                {inv.tax > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span className="text-gray-700">{fmtRs(inv.tax)}</span></div>}
                <div className="flex justify-between text-base font-black pt-2 border-t border-gray-200">
                  <span>Total</span><span>{fmtRs(inv.total)} {inv.currency}</span>
                </div>
              </div>

              {/* Payment submissions */}
              {payments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Submissions ({payments.length})</p>
                  <div className="space-y-2">
                    {payments.map(p => (
                      <div key={p._id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-700 capitalize">{p.receiptType?.replace('_', ' ')} · {fmtRs(p.amount)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                          {p.rejectionReason && <p className="text-[10px] text-red-500 mt-0.5">{p.rejectionReason}</p>}
                          {p.resubmissionNote && <p className="text-[10px] text-amber-600 mt-0.5">Note: {p.resubmissionNote}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          p.status === 'approved'       ? 'bg-green-100 text-green-700' :
                          p.status === 'rejected'       ? 'bg-red-100 text-red-700' :
                          p.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{p.status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const BillingHistory = () => {
  const navigate = useNavigate();

  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [pagination, setPag]      = useState({ total: 0, pages: 1 });
  const [page,      setPage]      = useState(1);
  const [selectedId, setSelected] = useState(null);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const { data } = await api.get(`/subscription/invoices?${p}`);
      setInvoices(data.data || []);
      setPag(data.pagination || { total: 0, pages: 1 });
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const handlePay = (invoiceId) => navigate('/admin/payments', { state: { invoiceId } });

  const hasFilters = search.trim() || statusFilter;

  if (loading && invoices.length === 0) {
    return (
      <div className="p-6 space-y-3 animate-pulse max-w-4xl mx-auto">
        <div className="h-7 w-48 bg-gray-200 rounded-xl" />
        <div className="flex gap-3"><div className="h-10 flex-1 bg-gray-200 rounded-xl" /><div className="h-10 w-32 bg-gray-200 rounded-xl" /></div>
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Billing History</h2>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} invoice{pagination.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/admin/payments')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all">
            <CreditCard size={15} /> Submit Payment
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search invoice number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white">
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button type="submit" className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all">
          Search
        </button>
        {hasFilters && (
          <button type="button" onClick={clearFilters}
            className="h-10 px-4 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-sm transition-all flex items-center gap-1.5">
            <XIcon size={13} /> Clear
          </button>
        )}
      </form>

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
          <Receipt size={36} className="mb-4 text-gray-300" />
          <p className="text-sm font-semibold">{hasFilters ? 'No invoices match your filters' : 'No invoices yet'}</p>
          <p className="text-xs text-gray-400 mt-1">{hasFilters ? 'Try adjusting your search or filter' : 'Invoices appear when you upgrade your plan'}</p>
          {hasFilters ? (
            <button onClick={clearFilters} className="mt-5 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all">
              Clear Filters
            </button>
          ) : (
            <button onClick={() => navigate('/admin/subscription')} className="mt-5 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all">
              View Plans
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const Icon     = STATUS_ICON[inv.status] || Clock;
            const isPending = inv.status === 'open';
            const isOverdue = isPending && inv.dueDate && new Date(inv.dueDate) < new Date();

            return (
              <div key={inv._id}
                className={`flex items-center justify-between bg-white border rounded-xl px-5 py-4 shadow-sm transition-all ${
                  isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    inv.status === 'paid' ? 'bg-green-100' : inv.status === 'open' ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <Icon size={16} className={
                      inv.status === 'paid' ? 'text-green-600' : inv.status === 'open' ? 'text-amber-600' : 'text-gray-400'
                    } />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">{inv.planId?.displayName || 'Subscription'} Plan</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_CLS[inv.status] || 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                        {STATUS_LABEL[inv.status] || inv.status}
                      </span>
                      {TYPE_LABEL[inv.invoiceType] && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {TYPE_LABEL[inv.invoiceType]}
                        </span>
                      )}
                      {isOverdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">OVERDUE</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {inv.invoiceNumber} · {fmtDate(inv.createdAt)}
                      {inv.dueDate && inv.status === 'open' && ` · Due ${fmtDate(inv.dueDate)}`}
                      {inv.paidAt && <span className="text-green-600"> · Paid {fmtDate(inv.paidAt)}</span>}
                    </p>
                    {inv.billingPeriodStart && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Period: {fmtDate(inv.billingPeriodStart)} – {fmtDate(inv.billingPeriodEnd)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <p className="text-base font-black text-gray-900">{fmtRs(inv.total)}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(inv._id)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="View Invoice">
                      <Eye size={15} />
                    </button>
                    {inv.status === 'open' && (
                      <button onClick={() => handlePay(inv._id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all">
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page === pagination.pages}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Invoice detail modal */}
      {selectedId && (
        <InvoiceModal
          invoiceId={selectedId}
          onClose={() => setSelected(null)}
          onPay={(id) => { setSelected(null); handlePay(id); }}
        />
      )}
    </div>
  );
};

export default BillingHistory;
