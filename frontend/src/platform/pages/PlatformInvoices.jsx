import { useState, useEffect, useCallback } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  XCircle, Receipt, Eye, X, Printer, Clock, Search, FileDown, RotateCcw,
} from 'lucide-react';

const STATUS_CLS = {
  draft:         'text-gray-400  bg-gray-700      border-transparent',
  open:          'text-amber-400 bg-amber-400/10  border-amber-400/20',
  paid:          'text-green-400 bg-green-400/10  border-green-400/20',
  void:          'text-gray-500  bg-gray-800      border-transparent',
  uncollectible: 'text-red-400   bg-red-400/10    border-red-400/20',
  cancelled:     'text-gray-500  bg-gray-700      border-transparent',
  refunded:      'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const TYPE_LABEL = {
  new_subscription: 'New',
  upgrade:          'Upgrade',
  downgrade:        'Downgrade',
  renewal:          'Renewal',
  reactivation:     'Reactivation',
  trial_conversion: 'Trial→Paid',
  platform_created: 'Platform',
  manual:           '',
};

const PAY_CLS = {
  pending_review: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  approved:       'text-green-400 bg-green-400/10 border-green-400/20',
  rejected:       'text-red-400   bg-red-400/10   border-red-400/20',
  cancelled:      'text-gray-500  bg-gray-700     border-transparent',
  succeeded:      'text-green-400 bg-green-400/10 border-green-400/20',
};

const fmtRs   = n => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const printInvoicePDF = (inv) => {
  const w = window.open('', '_blank');
  const lines = inv.lineItems?.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmtRs(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${fmtRs(item.amount)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#999">No line items</td></tr>`;

  w.document.write(`<!DOCTYPE html>
<html><head><title>Invoice ${inv.invoiceNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#111;background:#fff;padding:48px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .brand{font-size:24px;font-weight:900;letter-spacing:-0.5px}
  .brand-sub{font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:1px}
  .inv-num{font-size:18px;font-weight:800}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:6px;background:${inv.status==='paid'?'#dcfce7':'#fef3c7'};color:${inv.status==='paid'?'#166534':'#92400e'}}
  .meta{font-size:12px;color:#888;margin-top:4px}
  hr{border:none;border-top:1px solid #eee;margin:24px 0}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
  .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px}
  .val{font-size:14px;color:#111;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  thead{background:#f9f9f9}
  th{padding:12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#666}
  th:last-child,td:last-child{text-align:right}
  th:nth-child(2),td:nth-child(2){text-align:center}
  th:nth-child(3),td:nth-child(3){text-align:right}
  .totals{margin-left:auto;width:280px}
  .trow{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#555}
  .tfinal{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #111;font-size:16px;font-weight:900;color:#111;margin-top:4px}
  .foot{margin-top:48px;padding-top:24px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#bbb}
  @media print{body{padding:32px}}
</style></head>
<body>
  <div class="hdr">
    <div>
      <div class="brand">Bayroute</div>
      <div class="brand-sub">Restaurant POS Platform</div>
    </div>
    <div style="text-align:right">
      <div class="inv-num">Invoice #${inv.invoiceNumber}</div>
      <div class="badge">${inv.status?.toUpperCase()}</div>
      <div class="meta">Issued: ${fmtDate(inv.createdAt)}</div>
      ${inv.dueDate ? `<div class="meta">Due: ${fmtDate(inv.dueDate)}</div>` : ''}
      ${inv.paidAt ? `<div class="meta" style="color:#16a34a">Paid: ${fmtDate(inv.paidAt)}</div>` : ''}
    </div>
  </div>
  <div class="grid2">
    <div>
      <div class="lbl">Billed To</div>
      <div class="val"><strong>${inv.restaurantId?.name || '—'}</strong><br>${inv.restaurantId?.email || ''}${inv.restaurantId?.phone ? '<br>'+inv.restaurantId.phone : ''}</div>
    </div>
    <div>
      <div class="lbl">Subscription</div>
      <div class="val">${inv.planId?.displayName || '—'} Plan<br>${inv.subscriptionId?.billingCycle ? inv.subscriptionId.billingCycle.charAt(0).toUpperCase()+inv.subscriptionId.billingCycle.slice(1)+' billing' : ''}${inv.billingPeriodStart ? '<br>'+fmtDate(inv.billingPeriodStart)+' – '+fmtDate(inv.billingPeriodEnd) : ''}</div>
    </div>
  </div>
  <hr>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="totals">
    <div class="trow"><span>Subtotal</span><span>${fmtRs(inv.subtotal)}</span></div>
    ${inv.tax > 0 ? `<div class="trow"><span>Tax</span><span>${fmtRs(inv.tax)}</span></div>` : ''}
    <div class="tfinal"><span>Total</span><span>${fmtRs(inv.total)} ${inv.currency || 'PKR'}</span></div>
  </div>
  <div class="foot">Bayroute Restaurant POS · Thank you for your business</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 600);
};

const InvoiceDetailModal = ({ detail, loading, onClose, onMarkPaid, onVoid, onRefund, acting }) => {
  if (!detail) return null;
  const inv = detail.invoice;
  const payments = detail.payments || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <Receipt size={16} className="text-gray-500" />
            <div>
              <h3 className="font-bold text-white text-sm">{inv.invoiceNumber}</h3>
              <p className="text-[10px] text-gray-600">{fmtDate(inv.createdAt)}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[inv.status] || ''}`}>
              {inv.status}
            </span>
            {TYPE_LABEL[inv.invoiceType] && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-indigo-400 bg-indigo-400/10">
                {TYPE_LABEL[inv.invoiceType]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printInvoicePDF(inv)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-all"
            >
              <Printer size={12} /> Print PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading invoice…</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Billed To + Subscription */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-semibold text-white text-sm">{inv.restaurantId?.name || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{inv.restaurantId?.email || ''}</p>
                {inv.restaurantId?.phone && <p className="text-xs text-gray-500">{inv.restaurantId.phone}</p>}
                <p className="text-xs text-gray-600 mt-1 font-mono">@{inv.restaurantId?.slug}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Subscription</p>
                <p className="font-semibold text-white text-sm">{inv.planId?.displayName || '—'} Plan</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{inv.subscriptionId?.billingCycle || ''} billing</p>
                {inv.billingPeriodStart && (
                  <p className="text-xs text-gray-500 mt-1">{fmtDate(inv.billingPeriodStart)} – {fmtDate(inv.billingPeriodEnd)}</p>
                )}
              </div>
            </div>

            {/* Key dates */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Issued',    value: fmtDate(inv.createdAt) },
                { label: 'Due Date',  value: fmtDate(inv.dueDate)   },
                { label: inv.paidAt ? 'Paid On' : 'Status', value: inv.paidAt ? fmtDate(inv.paidAt) : inv.status },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-gray-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xs font-medium text-gray-300">{value}</p>
                </div>
              ))}
            </div>

            {/* Line items */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Line Items</p>
              {inv.lineItems?.length > 0 ? (
                <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        {['Description','Qty','Unit Price','Amount'].map(h => (
                          <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase ${h==='Qty' ? 'text-center' : h==='Description' ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {inv.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-gray-300">{item.description}</td>
                          <td className="px-4 py-3 text-center text-gray-400">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{fmtRs(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">{fmtRs(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">No line items recorded</p>
              )}
            </div>

            {/* Totals */}
            <div className="ml-auto w-52 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Subtotal</span><span>{fmtRs(inv.subtotal)}</span>
              </div>
              {inv.tax > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Tax</span><span>{fmtRs(inv.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white border-t border-gray-600 pt-2">
                <span>Total</span><span>{fmtRs(inv.total)} {inv.currency || 'PKR'}</span>
              </div>
            </div>

            {/* Payment submissions */}
            {payments.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Submissions</p>
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p._id} className="flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.status === 'approved' || p.status === 'succeeded'
                          ? <CheckCircle size={13} className="text-green-400 shrink-0" />
                          : p.status === 'rejected'
                          ? <XCircle size={13} className="text-red-400 shrink-0" />
                          : <Clock size={13} className="text-amber-400 shrink-0" />}
                        <div>
                          <p className="text-xs text-gray-300 capitalize">{p.receiptType?.replace('_',' ') || 'Manual'}</p>
                          <p className="text-[10px] text-gray-500">{fmtDate(p.createdAt)}</p>
                          {p.rejectionReason && <p className="text-[10px] text-red-400 mt-0.5">{p.rejectionReason}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PAY_CLS[p.status] || ''}`}>
                        {p.status?.replace('_',' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {inv.notes && (
              <div className="bg-gray-800/30 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-xs text-gray-400">{inv.notes}</p>
              </div>
            )}

            {/* Admin quick actions */}
            {(inv.status === 'open' || inv.status === 'paid') && (
              <div className="flex gap-3 pt-2 border-t border-gray-700/50">
                {inv.status === 'open' && (
                  <>
                    <button
                      onClick={() => { onMarkPaid(inv._id, inv.invoiceNumber); onClose(); }}
                      disabled={acting === inv._id}
                      className="flex-1 h-10 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={13} /> Mark Paid
                    </button>
                    <button
                      onClick={() => { onVoid(inv._id, inv.invoiceNumber); onClose(); }}
                      disabled={acting === inv._id}
                      className="flex-1 h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <XCircle size={13} /> Void Invoice
                    </button>
                  </>
                )}
                {inv.status === 'paid' && (
                  <button
                    onClick={() => { onRefund(inv._id, inv.invoiceNumber); onClose(); }}
                    disabled={acting === inv._id}
                    className="flex-1 h-10 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={13} /> Refund Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const PlatformInvoices = () => {
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPag]      = useState({ total: 0, pages: 1 });
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [search,       setSearch] = useState('');
  const [acting, setActing]       = useState(null);
  const [overview, setOverview]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 25 });
      if (statusFilter)  p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const [iRes, oRes] = await Promise.all([
        platformAPI.get(`/invoices?${p}`),
        platformAPI.get('/invoices/overview'),
      ]);
      setInvoices(iRes.data.data || []);
      setPag(iRes.data.pagination || { total: 0, pages: 1 });
      setOverview(oRes.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (inv) => {
    setDetail({ invoice: inv, payments: [] });
    setDetailLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        platformAPI.get(`/invoices/${inv._id}`),
        platformAPI.get(`/payments?invoiceId=${inv._id}&limit=20`),
      ]);
      setDetail({ invoice: invRes.data.data, payments: payRes.data.data || [] });
    } catch {
      toast.error('Failed to load invoice detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMarkPaid = async (id, number) => {
    setActing(id);
    try {
      await platformAPI.patch(`/invoices/${id}/mark-paid`);
      toast.success(`${number} marked as paid`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleVoid = async (id, number) => {
    if (!window.confirm(`Void invoice ${number}? This cannot be undone.`)) return;
    setActing(id);
    try {
      await platformAPI.patch(`/invoices/${id}/void`);
      toast.success(`${number} voided`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleRefund = async (id, number) => {
    const reason = window.prompt(`Reason for refunding ${number}:`, 'Refunded by platform admin');
    if (reason === null) return;
    setActing(id);
    try {
      await platformAPI.patch(`/invoices/${id}/refund`, { reason });
      toast.success(`${number} refunded`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter)  p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const res = await platformAPI.get(`/invoices/export?${p}`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const inputCls = 'h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      {detail && (
        <InvoiceDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onMarkPaid={handleMarkPaid}
          onVoid={handleVoid}
          onRefund={handleRefund}
          acting={acting}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Invoices</h2>
          <p className="text-xs text-gray-600 mt-1">{pagination.total} total invoices</p>
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

      {/* KPI overview */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Revenue',  value: fmtRs(overview.totalRevenue)     },
            { label: 'This Month',     value: fmtRs(overview.monthRevenue)     },
            { label: 'Last Month',     value: fmtRs(overview.lastMonthRevenue) },
            { label: 'Open Invoices',  value: overview.openInvoices            },
            { label: 'Overdue',        value: overview.overdueInvoices         },
            { label: 'Total Invoices', value: overview.totalInvoices           },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-base font-black text-white">{value ?? '—'}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }} className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by restaurant or invoice #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputCls} pl-8 w-72`}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Status</option>
          {['draft','open','paid','void','uncollectible','cancelled','refunded'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button type="submit" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all">
          Search
        </button>
        {(statusFilter || search) && (
          <button
            type="button"
            onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
            className="h-9 px-3 text-sm text-gray-600 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <Receipt size={32} className="mb-3 text-gray-700" />
            <p className="text-sm">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Invoice #','Restaurant','Plan','Amount','Status','Due Date','Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {invoices.map(inv => {
                  const isOverdue = inv.status === 'open' && inv.dueDate && new Date(inv.dueDate) < new Date();
                  return (
                    <tr key={inv._id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">{inv.invoiceNumber}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-white text-sm">{inv.restaurantId?.name || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{inv.planId?.displayName || '—'}</td>
                      <td className="px-5 py-4 font-bold text-white text-xs">{fmtRs(inv.total)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[inv.status] || 'text-gray-400 bg-gray-700 border-transparent'}`}>
                            {inv.status}
                          </span>
                          {TYPE_LABEL[inv.invoiceType] && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-indigo-400 bg-indigo-400/10">
                              {TYPE_LABEL[inv.invoiceType]}
                            </span>
                          )}
                          {isOverdue && <span className="text-[10px] font-bold text-red-400">OVERDUE</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{fmtDate(inv.dueDate)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDetail(inv)}
                            title="View detail"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          {inv.status === 'open' && (
                            <>
                              <button
                                onClick={() => handleMarkPaid(inv._id, inv.invoiceNumber)}
                                disabled={acting === inv._id}
                                title="Mark Paid"
                                className="p-1.5 rounded-lg text-gray-600 hover:text-green-400 hover:bg-green-400/10 transition-all disabled:opacity-40"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleVoid(inv._id, inv.invoiceNumber)}
                                disabled={acting === inv._id}
                                title="Void"
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

export default PlatformInvoices;
