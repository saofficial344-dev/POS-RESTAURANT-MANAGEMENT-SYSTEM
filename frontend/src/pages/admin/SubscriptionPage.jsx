import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, RefreshCcw,
  X, RotateCcw, ArrowUpCircle, ArrowDownCircle, Users, GitBranch, ShoppingCart,
  Calendar, Zap, Table2, Receipt, Eye, Search, Upload, Image, FileText,
  ZoomIn, Download, ChevronLeft, ChevronRight, AlertCircle, TrendingUp,
  Activity, Package, Code2, BarChart3, Heart, Truck, Monitor, Globe,
  Headphones, Database, Shield, Star, Bell, ArrowRight, DollarSign,
  LayoutDashboard, Settings,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard },
  { id: 'usage',     label: 'Analytics',  icon: BarChart3 },
  { id: 'plans',     label: 'Plans',      icon: Star },
  { id: 'billing',   label: 'Billing',    icon: Receipt },
  { id: 'payments',  label: 'Payments',   icon: CreditCard },
];

const STATUS_CFG = {
  trial:     { label: 'Free Trial',  cls: 'text-amber-700  bg-amber-50   border-amber-200',  dot: 'bg-amber-500'  },
  active:    { label: 'Active',      cls: 'text-green-700  bg-green-50   border-green-200',  dot: 'bg-green-500'  },
  past_due:  { label: 'Past Due',    cls: 'text-orange-700 bg-orange-50  border-orange-200', dot: 'bg-orange-500' },
  suspended: { label: 'Suspended',   cls: 'text-red-700    bg-red-50     border-red-200',    dot: 'bg-red-500'    },
  expired:   { label: 'Expired',     cls: 'text-red-700    bg-red-50     border-red-200',    dot: 'bg-red-500'    },
  cancelled: { label: 'Cancelled',   cls: 'text-gray-500   bg-gray-100   border-gray-300',   dot: 'bg-gray-400'   },
};

const INVOICE_STATUS = {
  draft:         { label: 'Draft',         cls: 'text-gray-500   bg-gray-100  border-gray-200'  },
  open:          { label: 'Open',          cls: 'text-amber-700  bg-amber-50  border-amber-200' },
  paid:          { label: 'Paid',          cls: 'text-green-700  bg-green-50  border-green-200' },
  void:          { label: 'Void',          cls: 'text-gray-400   bg-gray-100  border-gray-200'  },
  uncollectible: { label: 'Uncollectible', cls: 'text-red-600    bg-red-50    border-red-200'   },
  cancelled:     { label: 'Cancelled',     cls: 'text-gray-500   bg-gray-100  border-gray-200'  },
  refunded:      { label: 'Refunded',      cls: 'text-purple-700 bg-purple-50 border-purple-200'},
};

const PAYMENT_STATUS = {
  pending_review: { label: 'Under Review', cls: 'text-amber-700 bg-amber-50  border-amber-200' },
  approved:       { label: 'Approved',     cls: 'text-green-700 bg-green-50  border-green-200' },
  rejected:       { label: 'Rejected',     cls: 'text-red-700   bg-red-50    border-red-200'   },
  cancelled:      { label: 'Cancelled',    cls: 'text-gray-500  bg-gray-100  border-gray-200'  },
};

const FEATURE_META = {
  inventory:       { label: 'Inventory Tracking', icon: Package,    desc: 'Real-time stock management'          },
  advancedReports: { label: 'Advanced Reports',   icon: BarChart3,  desc: 'Deep analytics & export'            },
  apiAccess:       { label: 'API Access',         icon: Code2,      desc: 'Full REST API integration'          },
  multiBranch:     { label: 'Multi-Branch',       icon: GitBranch,  desc: 'Manage multiple locations'          },
  loyalty:         { label: 'Loyalty Program',    icon: Heart,      desc: 'Customer points & rewards'          },
  delivery:        { label: 'Delivery Module',    icon: Truck,      desc: 'Online ordering & delivery'        },
  kitchenDisplay:  { label: 'Kitchen Display',    icon: Monitor,    desc: 'KDS for kitchen staff'              },
  analytics:       { label: 'Analytics Dashboard',icon: TrendingUp, desc: 'Business intelligence dashboard'    },
  customDomain:    { label: 'Custom Domain',      icon: Globe,      desc: 'Brand your own domain'              },
  prioritySupport: { label: 'Priority Support',   icon: Headphones, desc: '24/7 dedicated support'             },
  multipleAdmins:  { label: 'Multiple Admins',    icon: Users,      desc: 'Multiple admin accounts'            },
  exportData:      { label: 'Export Data',        icon: Download,   desc: 'CSV & PDF data exports'             },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmtRs   = n => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysLeft = d => { if (!d) return null; return Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000)); };
const fmtPeriod = p => {
  if (!p) return '';
  const [y, m] = p.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};
const pct = (used, limit) => (!limit || limit < 0) ? 0 : Math.min(100, Math.round((used / limit) * 100));
const barColor = p => p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-500' : 'bg-indigo-500';

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-left">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: e.color }}>{e.name}: <span>{e.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, accent = 'indigo', alert = false }) => {
  const accentMap = {
    indigo: 'text-indigo-600 bg-indigo-50',
    green:  'text-green-600  bg-green-50',
    amber:  'text-amber-600  bg-amber-50',
    red:    'text-red-600    bg-red-50',
    gray:   'text-gray-500   bg-gray-100',
  };
  return (
    <div className={`bg-white border rounded-2xl p-5 flex flex-col gap-3 ${alert ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentMap[accent] || accentMap.indigo}`}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-black ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Usage progress bar ────────────────────────────────────────────────────────
const UsageBar = ({ label, icon: Icon, current, limit, accent = 'indigo' }) => {
  const unlimited = !limit || limit < 0;
  const p         = unlimited ? 0 : pct(current, limit);
  const color     = p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-500' : `bg-${accent}-500`;
  const textColor = p >= 90 ? 'text-red-600' : p >= 70 ? 'text-amber-600' : 'text-gray-900';
  const remaining = unlimited ? null : Math.max(0, limit - current);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500">{label}</span>
        </div>
        {!unlimited && p >= 80 && <AlertTriangle size={12} className={p >= 90 ? 'text-red-500' : 'text-amber-500'} />}
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className={`text-3xl font-black ${textColor}`}>{(current || 0).toLocaleString()}</span>
        <span className="text-sm text-gray-400">{unlimited ? '∞' : `/ ${limit?.toLocaleString()}`}</span>
      </div>
      {!unlimited && (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${p}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{p}% used</span>
            <span>{remaining?.toLocaleString()} remaining</span>
          </div>
        </>
      )}
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = ({ className }) => <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, confirmText, onConfirm, onClose, danger = false, loading = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
      <h3 className="text-base font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 h-11 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-gray-800'}`}>
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Please wait…</> : confirmText}
        </button>
      </div>
    </div>
  </div>
);

// ── Plan Change Modal ─────────────────────────────────────────────────────────
const PlanChangeModal = ({ type, currentPlan, newPlan, billingCycle, onBillingCycleChange, loading, onConfirm, onClose }) => {
  const currentPrice = billingCycle === 'yearly' ? currentPlan?.price?.yearly  : currentPlan?.price?.monthly;
  const newPrice     = billingCycle === 'yearly' ? newPlan?.price?.yearly      : newPlan?.price?.monthly;
  const priceDiff    = (newPrice || 0) - (currentPrice || 0);
  const isUpgrade    = type === 'upgrade';

  const gained = Object.keys(FEATURE_META).filter(k => !currentPlan?.features?.[k] && newPlan?.features?.[k]);
  const lost   = Object.keys(FEATURE_META).filter(k =>  currentPlan?.features?.[k] && !newPlan?.features?.[k]);

  const limitKeys    = ['branches', 'staff', 'tables', 'monthlyOrders'];
  const limitLabels  = { branches: 'Branches', staff: 'Staff', tables: 'Tables', monthlyOrders: 'Orders/mo' };
  const limitChanges = limitKeys
    .filter(k => (currentPlan?.limits?.[k] ?? -1) !== (newPlan?.limits?.[k] ?? -1))
    .map(k => ({ k, label: limitLabels[k], from: currentPlan?.limits?.[k] ?? -1, to: newPlan?.limits?.[k] ?? -1 }));

  const today   = new Date();
  const endDate = new Date(today);
  billingCycle === 'yearly' ? endDate.setFullYear(endDate.getFullYear() + 1) : endDate.setMonth(endDate.getMonth() + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`px-7 py-5 flex items-center justify-between ${isUpgrade ? 'bg-gray-900' : 'bg-amber-800'}`}>
          <div>
            <h3 className="text-lg font-black text-white">{isUpgrade ? 'Confirm Plan Upgrade' : 'Confirm Plan Downgrade'}</h3>
            <p className="text-sm text-white/60 mt-0.5">{currentPlan?.displayName} → {newPlan?.displayName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="p-7 overflow-y-auto max-h-[75vh] space-y-5">
          {/* Billing cycle */}
          <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
            {['monthly', 'yearly'].map(c => (
              <button key={c} onClick={() => onBillingCycleChange(c)}
                className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && <span className="ml-1 text-[9px] text-green-600">SAVE</span>}
              </button>
            ))}
          </div>

          {/* Plan comparison */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { p: currentPlan, label: 'Current Plan', highlighted: false },
              { p: newPlan,     label: 'New Plan',     highlighted: true  },
            ].map(({ p, label, highlighted }) => {
              const price = billingCycle === 'yearly' ? p?.price?.yearly : p?.price?.monthly;
              return (
                <div key={label} className={`rounded-2xl p-5 border-2 ${highlighted ? (isUpgrade ? 'border-gray-900 bg-gray-50' : 'border-amber-400 bg-amber-50') : 'border-gray-200 bg-white'}`}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p?.color || '#9CA3AF' }} />
                    <p className="font-black text-gray-900 text-lg">{p?.displayName || '—'}</p>
                  </div>
                  <p className={`text-2xl font-black ${highlighted && isUpgrade ? 'text-gray-900' : 'text-gray-600'}`}>
                    {price === 0 ? 'Free' : fmtRs(price)}
                  </p>
                  <p className="text-xs text-gray-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</p>
                </div>
              );
            })}
          </div>

          {/* Price diff */}
          {priceDiff !== 0 && (
            <div className={`flex items-center gap-3 rounded-xl px-5 py-3.5 ${priceDiff > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
              {priceDiff > 0
                ? <ArrowUpCircle size={18} className="text-blue-500 shrink-0" />
                : <ArrowDownCircle size={18} className="text-green-500 shrink-0" />}
              <div>
                <p className="text-sm font-bold text-gray-800">{priceDiff > 0 ? `+${fmtRs(priceDiff)}` : fmtRs(priceDiff)} / {billingCycle === 'yearly' ? 'yr' : 'mo'}</p>
                {(newPrice ?? 0) > 0 && <p className="text-xs text-gray-500">Invoice of <strong>{fmtRs(newPrice)}</strong> generated. Submit payment to activate.</p>}
              </div>
            </div>
          )}

          {/* Feature changes */}
          {(gained.length > 0 || lost.length > 0) && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Feature Changes</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {gained.map(k => (
                  <div key={k} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-700 font-medium">
                    <CheckCircle size={12} className="text-green-500 shrink-0" /> {FEATURE_META[k]?.label} added
                  </div>
                ))}
                {lost.map(k => (
                  <div key={k} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 font-medium">
                    <XCircle size={12} className="text-red-400 shrink-0" /> {FEATURE_META[k]?.label} removed
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limit changes */}
          {limitChanges.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resource Limit Changes</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Resource</th>
                    <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Current</th>
                    <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">New</th>
                    <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Change</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {limitChanges.map(l => {
                      const up = l.to === -1 || (l.from !== -1 && l.to > l.from);
                      return (
                        <tr key={l.k}>
                          <td className="px-4 py-2.5 font-medium text-gray-700">{l.label}</td>
                          <td className="px-4 py-2.5 text-center text-gray-400">{l.from < 0 ? '∞' : l.from}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">{l.to < 0 ? '∞' : l.to}</td>
                          <td className="px-4 py-2.5 text-center"><span className={`font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>{up ? '↑ More' : '↓ Less'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Billing details */}
          <div className="bg-gray-50 rounded-xl px-5 py-4 grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Invoice Date',  val: fmtDate(today) },
              { label: 'New Period End', val: fmtDate(endDate) },
              { label: 'Billing Cycle', val: billingCycle === 'yearly' ? 'Yearly' : 'Monthly' },
              { label: 'Invoice Amount', val: (newPrice ?? 0) > 0 ? fmtRs(newPrice) : 'Free' },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-semibold text-gray-800">{val}</p>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            Your current plan stays active until payment is submitted and approved by the platform team. The new plan activates automatically upon approval.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={onConfirm} disabled={loading}
              className={`flex-1 h-11 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${isUpgrade ? 'bg-gray-900 hover:bg-gray-800' : 'bg-amber-700 hover:bg-amber-800'}`}>
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Processing…</> : <><ArrowUpCircle size={14} /> Generate Invoice & Pay</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Invoice Detail Modal ──────────────────────────────────────────────────────
const InvoiceModal = ({ invoiceId, onClose, onPay }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

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
    win.document.write(`<!DOCTYPE html><html><head><title>${inv.invoiceNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;color:#111}
.hd{display:flex;justify-content:space-between;margin-bottom:40px}.brand{font-size:22px;font-weight:900}
.inv{text-align:right}.inv-num{font-size:18px;font-weight:900;color:#4F46E5}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{text-align:left;padding:10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#666;border-bottom:2px solid #eee}
td{padding:12px;font-size:13px;border-bottom:1px solid #f0f0f0}
.total{display:flex;justify-content:space-between;padding:10px;font-size:14px}
.grand{font-size:18px;font-weight:900;background:#f9fafb;border-radius:8px;padding:14px}
.footer{margin-top:48px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:20px}
</style></head><body>
<div class="hd"><div><div class="brand">Restaurant POS</div><small style="color:#888">Subscription Invoice</small></div>
<div class="inv"><div class="inv-num">${inv.invoiceNumber}</div><small>${inv.status?.toUpperCase()}</small></div></div>
<p><strong>Bill To:</strong> ${inv.restaurantId?.name || 'Restaurant'}</p>
<p style="margin-top:8px;font-size:12px;color:#666">Period: ${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}</p>
<p style="font-size:12px;color:#666">Due: ${fmtDate(inv.dueDate)}${inv.paidAt ? ' · Paid: ' + fmtDate(inv.paidAt) : ''}</p>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${(inv.lineItems || []).map(li => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${fmtRs(li.unitPrice)}</td><td style="text-align:right">${fmtRs(li.amount)}</td></tr>`).join('')}</tbody></table>
<div style="margin-top:20px"><div class="total"><span>Subtotal</span><span>${fmtRs(inv.subtotal)}</span></div>
${inv.tax > 0 ? `<div class="total"><span>Tax</span><span>${fmtRs(inv.tax)}</span></div>` : ''}
<div class="total grand"><span>Total</span><span>${fmtRs(inv.total)} ${inv.currency}</span></div></div>
<div class="footer">Thank you for your business.</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`);
    win.document.close();
  };

  const inv      = data?.invoice;
  const payments = data?.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-black text-gray-900">{loading ? 'Loading…' : (inv?.invoiceNumber || '—')}</p>
            {inv && <p className="text-xs text-gray-400">{fmtDate(inv.createdAt)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {inv?.status === 'open' && (
              <button onClick={() => { onClose(); onPay(inv._id); }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all">Pay Now</button>
            )}
            <button onClick={printInvoice} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="Print PDF">
              <Download size={15} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"><X size={15} /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading invoice…</div>
        ) : !inv ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">Invoice not found</div>
        ) : (
          <div className="overflow-y-auto max-h-[70vh] p-6 space-y-5">
            {/* Meta */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Status', badge: true, val: inv.status },
                { label: 'Plan', val: inv.planId?.displayName || '—' },
                { label: 'Amount', val: `${fmtRs(inv.total)} ${inv.currency}`, bold: true },
                { label: 'Issue Date', val: fmtDate(inv.createdAt) },
                { label: 'Due Date', val: fmtDate(inv.dueDate) },
                { label: 'Paid On', val: inv.paidAt ? fmtDate(inv.paidAt) : '—' },
              ].map(({ label, val, badge, bold }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  {badge
                    ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${INVOICE_STATUS[val]?.cls || ''}`}>{INVOICE_STATUS[val]?.label || val}</span>
                    : <p className={`text-sm ${bold ? 'font-black text-gray-900' : 'font-medium text-gray-700'}`}>{val}</p>}
                </div>
              ))}
            </div>

            {/* Period */}
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Period</p>
              <p className="text-sm text-gray-700">{fmtDate(inv.billingPeriodStart)} — {fmtDate(inv.billingPeriodEnd)}</p>
            </div>

            {/* Line items */}
            {inv.lineItems?.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {inv.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3 text-sm border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{li.description}</span>
                    <span className="font-bold text-gray-900">{fmtRs(li.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="bg-gray-50 rounded-xl px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{fmtRs(inv.subtotal)}</span></div>
              {inv.tax > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{fmtRs(inv.tax)}</span></div>}
              <div className="flex justify-between font-black pt-2 border-t border-gray-200"><span>Total</span><span>{fmtRs(inv.total)} {inv.currency}</span></div>
            </div>

            {/* Payments */}
            {payments.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Submissions</p>
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 capitalize">{p.receiptType?.replace('_', ' ')} · {fmtRs(p.amount)}</p>
                        {p.referenceNumber && <p className="text-[10px] text-indigo-600 font-mono mt-0.5">Ref: {p.referenceNumber}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                        {p.rejectionReason && <p className="text-[10px] text-red-500 mt-0.5">{p.rejectionReason}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PAYMENT_STATUS[p.status]?.cls || ''}`}>
                        {PAYMENT_STATUS[p.status]?.label || p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Receipt Zoom Modal ────────────────────────────────────────────────────────
const ReceiptZoom = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose}>
    <div className="absolute top-4 right-4 flex gap-2">
      <button onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href = src; a.download = `receipt-${Date.now()}.png`; a.click(); }}
        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all">
        <Download size={12} /> Download
      </button>
      <button onClick={onClose} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium">Close ✕</button>
    </div>
    <img src={src} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═════════════════════════════════════════════════════════════════════════════
const OverviewTab = ({ sub, usage, recentInvoices, recentPayments, openInvoices, onAction, onTabSwitch, plans = [] }) => {
  const subscription = sub?.subscription;
  const currentPlan  = subscription?.planId;
  const status       = subscription?.status || 'trial';
  const limits       = usage?.limits  || {};
  const current      = usage?.current || {};
  const restaurant   = sub?.restaurant;
  const trialUsed    = restaurant?.trialUsed || false;

  const isHighestPlan = plans.length > 0 && currentPlan
    ? currentPlan.sortOrder >= Math.max(...plans.map(p => p.sortOrder ?? 0))
    : false;

  const trialLeft   = daysLeft(subscription?.trialEnd);
  const renewalLeft = daysLeft(subscription?.currentPeriodEnd);
  const price       = subscription?.billingCycle === 'yearly' ? currentPlan?.price?.yearly : currentPlan?.price?.monthly;

  // Build activity feed from invoices + payments
  const activity = [
    ...(recentInvoices || []).slice(0, 5).map(inv => ({
      id: inv._id, type: 'invoice', date: inv.createdAt,
      title: `Invoice ${inv.invoiceNumber}`,
      desc:  `${inv.planId?.displayName || 'Subscription'} · ${fmtRs(inv.total)}`,
      badge: INVOICE_STATUS[inv.status]?.label || inv.status,
      badgeCls: INVOICE_STATUS[inv.status]?.cls || '',
      icon: Receipt, iconBg: inv.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
    })),
    ...(recentPayments || []).slice(0, 5).map(p => ({
      id: p._id, type: 'payment', date: p.createdAt,
      title: p.status === 'approved' ? 'Payment Approved' : p.status === 'rejected' ? 'Payment Rejected' : 'Payment Submitted',
      desc:  `${fmtRs(p.amount)} · ${p.invoiceId?.invoiceNumber || 'Manual payment'}`,
      badge: PAYMENT_STATUS[p.status]?.label || p.status,
      badgeCls: PAYMENT_STATUS[p.status]?.cls || '',
      icon: CreditCard,
      iconBg: p.status === 'approved' ? 'bg-green-100 text-green-600' : p.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  // Notifications
  const notifications = [];
  if (status === 'trial' && trialLeft !== null && trialLeft <= 7)
    notifications.push({ type: 'warn', msg: `Trial ends in ${trialLeft} day${trialLeft !== 1 ? 's' : ''}`, cta: 'Upgrade Now', tab: 'plans' });
  if (status === 'active' && renewalLeft !== null && renewalLeft <= 7)
    notifications.push({ type: 'info', msg: `Subscription renews in ${renewalLeft} day${renewalLeft !== 1 ? 's' : ''}`, cta: 'View Billing', tab: 'billing' });
  if (openInvoices.length > 0)
    notifications.push({ type: 'danger', msg: `${openInvoices.length} invoice${openInvoices.length !== 1 ? 's' : ''} pending payment`, cta: 'Pay Now', tab: 'payments' });

  const kpis = [
    { label: 'Current Plan',    value: currentPlan?.displayName || '—',          sub: `${(price ?? 0) > 0 ? fmtRs(price) : 'Free'} / ${subscription?.billingCycle || 'month'}`, icon: Star,         accent: 'indigo' },
    { label: 'Status',          value: STATUS_CFG[status]?.label || status,       sub: subscription?.billingCycle ? `Billing: ${subscription.billingCycle}` : '—',              icon: Shield,        accent: status === 'active' ? 'green' : status === 'trial' ? 'amber' : 'red' },
    { label: 'Renewal Date',    value: fmtDate(subscription?.currentPeriodEnd),   sub: renewalLeft !== null ? `${renewalLeft} days remaining` : '—',                            icon: Calendar,      accent: renewalLeft !== null && renewalLeft <= 7 ? 'amber' : 'indigo', alert: renewalLeft !== null && renewalLeft <= 3 },
    { label: 'Monthly Cost',    value: (price ?? 0) > 0 ? fmtRs(price) : 'Free', sub: subscription?.billingCycle === 'yearly' ? `${fmtRs(Math.round(price/12))}/mo equiv.` : 'Billed monthly', icon: DollarSign, accent: 'indigo' },
    { label: 'Branches Used',   value: `${current.branches || 0} / ${limits.branches < 0 ? '∞' : (limits.branches || '—')}`, sub: limits.branches > 0 ? `${pct(current.branches, limits.branches)}% used` : 'Unlimited', icon: GitBranch, accent: pct(current.branches, limits.branches) >= 80 ? 'red' : 'indigo', alert: pct(current.branches, limits.branches) >= 90 },
    { label: 'Staff Members',   value: `${current.staff || 0} / ${limits.staff < 0 ? '∞' : (limits.staff || '—')}`,         sub: limits.staff > 0 ? `${pct(current.staff, limits.staff)}% used` : 'Unlimited',         icon: Users,     accent: pct(current.staff, limits.staff) >= 80 ? 'red' : 'indigo', alert: pct(current.staff, limits.staff) >= 90 },
    { label: 'Monthly Orders',  value: `${current.orders || 0} / ${limits.monthlyOrders < 0 ? '∞' : (limits.monthlyOrders || '—')}`, sub: limits.monthlyOrders > 0 ? `${pct(current.orders, limits.monthlyOrders)}% used` : 'Unlimited', icon: ShoppingCart, accent: pct(current.orders, limits.monthlyOrders) >= 80 ? 'red' : 'indigo', alert: pct(current.orders, limits.monthlyOrders) >= 90 },
    { label: 'Tables',          value: `${current.tables || 0} / ${limits.tables < 0 ? '∞' : (limits.tables || '—')}`,      sub: limits.tables > 0 ? `${pct(current.tables, limits.tables)}% used` : 'Unlimited',      icon: Table2,    accent: pct(current.tables, limits.tables) >= 80 ? 'red' : 'indigo', alert: pct(current.tables, limits.tables) >= 90 },
  ];

  const quickActions = [
    { label: isHighestPlan ? 'Highest Plan' : 'Upgrade Plan', icon: ArrowUpCircle, onClick: () => onTabSwitch('plans'), cls: isHighestPlan ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-default' : 'bg-gray-900 hover:bg-gray-800 text-white', hide: false },
    { label: 'Billing History', icon: Receipt,       onClick: () => onTabSwitch('billing'),  cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
    { label: 'Submit Payment',  icon: Upload,        onClick: () => onTabSwitch('payments'), cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
    { label: 'Usage Analytics', icon: BarChart3,     onClick: () => onTabSwitch('usage'),    cls: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' },
    { label: 'Cancel Plan',     icon: XCircle,       onClick: () => onAction('cancel'),      cls: 'bg-white border border-red-200 text-red-500 hover:bg-red-50', hide: !['trial','active'].includes(status) },
    { label: 'Reactivate',      icon: RotateCcw,     onClick: () => onAction('reactivate'),  cls: 'bg-green-600 hover:bg-green-700 text-white',                   hide: !['cancelled','expired'].includes(status) },
  ].filter(a => !a.hide);

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl px-5 py-3.5 border ${
              n.type === 'danger' ? 'bg-red-50 border-red-200' : n.type === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                <Bell size={16} className={n.type === 'danger' ? 'text-red-500' : n.type === 'warn' ? 'text-amber-500' : 'text-blue-500'} />
                <p className={`text-sm font-semibold ${n.type === 'danger' ? 'text-red-800' : n.type === 'warn' ? 'text-amber-800' : 'text-blue-800'}`}>{n.msg}</p>
              </div>
              <button onClick={() => onTabSwitch(n.tab)}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
                  n.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : n.type === 'warn' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}>{n.cta}</button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">At a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </div>
      </div>

      {/* Quick Actions + Subscription Details side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map(a => (
              <button key={a.label} onClick={a.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${a.cls}`}>
                <a.icon size={16} className="shrink-0" /> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subscription Details */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-5">Subscription Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              { label: 'Plan',             value: currentPlan?.displayName || '—' },
              { label: 'Status',           value: STATUS_CFG[status]?.label || status },
              { label: 'Billing Cycle',    value: subscription?.billingCycle ? subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1) : '—' },
              { label: 'Start Date',       value: fmtDate(subscription?.currentPeriodStart) },
              { label: 'Renewal / Expiry', value: fmtDate(subscription?.currentPeriodEnd) },
              { label: 'Trial End',        value: subscription?.trialEnd ? fmtDate(subscription.trialEnd) : 'N/A' },
              { label: 'Auto Renew',       value: subscription?.autoRenew ? 'Enabled' : 'Disabled', cls: subscription?.autoRenew ? 'text-green-600' : 'text-gray-400' },
              { label: 'Currency',         value: currentPlan?.price?.currency || 'PKR' },
              { label: 'Restaurant',       value: restaurant?.name || '—' },
            ].map(({ label, value, cls }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-sm font-semibold ${cls || 'text-gray-800'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          {currentPlan?.features && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Plan Features</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(FEATURE_META).map(([k, meta]) => {
                  const enabled = currentPlan.features[k];
                  return (
                    <div key={k} className={`flex items-center gap-2 text-xs ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                      {enabled ? <CheckCircle size={12} className="text-green-500 shrink-0" /> : <XCircle size={12} className="text-gray-300 shrink-0" />}
                      {meta.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-gray-700">Recent Activity</h3>
          <div className="flex gap-2">
            <button onClick={() => onTabSwitch('billing')}   className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Billing →</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => onTabSwitch('payments')}  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Payments →</button>
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Activity size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activity.map((ev, i) => (
              <div key={ev.id || i} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-gray-50 transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ev.iconBg}`}>
                  <ev.icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400 truncate">{ev.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${ev.badgeCls}`}>{ev.badge}</span>
                  <p className="text-[10px] text-gray-400 mt-1">{fmtDate(ev.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB: USAGE & ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════
const UsageTab = ({ usage, loading }) => {
  const limits  = usage?.limits  || {};
  const current = usage?.current || {};
  const periods = usage?.periods || [];

  const chartData = [...periods].reverse().map(p => ({
    name:     fmtPeriod(p.period),
    Orders:   p.orders    || 0,
    Staff:    p.staff     || 0,
    Branches: p.branches  || 0,
    Tables:   p.tables    || 0,
  }));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Orders chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-gray-800">Monthly Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 12 months · Total this month: {(current.orders || 0).toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
            <ShoppingCart size={15} className="text-indigo-600" />
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="Orders" stroke="#6366F1" strokeWidth={2} fill="url(#gOrders)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">No usage history yet</div>
        )}
      </div>

      {/* Staff + Branches chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-gray-800">Staff & Branches</h3>
              <p className="text-xs text-gray-400 mt-0.5">Active users and locations over time</p>
            </div>
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
              <Users size={15} className="text-green-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gStaff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gBranch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="Staff"    stroke="#10B981" strokeWidth={2} fill="url(#gStaff)"  dot={false} />
              <Area type="monotone" dataKey="Branches" stroke="#F59E0B" strokeWidth={2} fill="url(#gBranch)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Usage bars grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Current Month Usage</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <UsageBar label="Branches"       icon={GitBranch}    current={current.branches || 0}  limit={limits.branches      ?? -1} />
          <UsageBar label="Staff Members"  icon={Users}        current={current.staff    || 0}  limit={limits.staff          ?? -1} accent="green" />
          <UsageBar label="Tables"         icon={Table2}       current={current.tables   || 0}  limit={limits.tables         ?? -1} accent="amber" />
          <UsageBar label="Monthly Orders" icon={ShoppingCart} current={current.orders   || 0}  limit={limits.monthlyOrders  ?? -1} />
          <UsageBar label="Storage (GB)"   icon={Database}     current={current.storageGB   || 0} limit={limits.storageGB      ?? -1} accent="green" />
          <UsageBar label="API Requests/day" icon={Code2}      current={current.apiRequests || 0} limit={limits.apiRequestsPerDay ?? -1} accent="amber" />
        </div>
      </div>

      {/* Plan limits reference */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Plan Limits Reference</h3>
        <div className="divide-y divide-gray-100">
          {[
            { label: 'Branches',           val: limits.branches,         icon: GitBranch    },
            { label: 'Staff Members',      val: limits.staff,            icon: Users        },
            { label: 'Tables',             val: limits.tables,           icon: Table2       },
            { label: 'Monthly Orders',     val: limits.monthlyOrders,    icon: ShoppingCart },
            { label: 'Storage',            val: limits.storageGB,        icon: Database, suffix: ' GB' },
            { label: 'API Requests/Day',   val: limits.apiRequestsPerDay,icon: Code2        },
          ].map(({ label, val, icon: Icon, suffix = '' }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">{label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{!val || val < 0 ? 'Unlimited' : `${val.toLocaleString()}${suffix}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB: PLANS
// ═════════════════════════════════════════════════════════════════════════════
const PlansTab = ({ plans, currentPlan, onUpgrade, trialUsed = false, subStatus = '' }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const yearlyDiscount = plan => {
    if (!plan?.price?.yearly || !plan?.price?.monthly || plan.price.monthly === 0) return 0;
    return Math.round(((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100);
  };

  const minSortOrder  = plans.length ? Math.min(...plans.map(p => p.sortOrder ?? 0)) : 0;
  const maxSortOrder  = plans.length ? Math.max(...plans.map(p => p.sortOrder ?? 0)) : 0;
  const isTrialEligible = !trialUsed && subStatus !== 'trial';

  if (!plans.length) return (
    <div className="flex flex-col items-center py-20 text-gray-400">
      <Star size={36} className="mb-4 text-gray-300" />
      <p className="text-sm">No plans available</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-800">Available Plans</h3>
          <p className="text-xs text-gray-400 mt-0.5">Choose a plan that fits your restaurant</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {['monthly', 'yearly'].map(c => (
            <button key={c} onClick={() => setBillingCycle(c)}
              className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {c === 'monthly' ? 'Monthly' : 'Yearly'}
              {c === 'yearly' && <span className="ml-1 text-[9px] text-green-600 font-bold">SAVE</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(plan => {
          const isCurrent       = plan.slug === currentPlan?.slug;
          const isLowest        = plan.sortOrder === minSortOrder;
          const isHighest       = plan.sortOrder === maxSortOrder;
          const price           = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
          const monthlyEq       = billingCycle === 'yearly' && plan.price.yearly > 0 ? Math.round(plan.price.yearly / 12) : null;
          const discount        = yearlyDiscount(plan);
          const isUpgrade       = !isCurrent && currentPlan?.sortOrder !== undefined && plan.sortOrder > currentPlan.sortOrder;
          const isDowngrade     = !isCurrent && currentPlan?.sortOrder !== undefined && plan.sortOrder < currentPlan.sortOrder;
          const showTrialBadge  = isLowest && isTrialEligible && !isCurrent;
          const enabledFeatures = Object.entries(plan.features || {}).filter(([, v]) => v).length;

          return (
            <div key={plan._id}
              className={`relative bg-white border-2 rounded-2xl p-6 shadow-sm flex flex-col transition-all hover:shadow-md ${
                isCurrent ? 'border-indigo-400 ring-4 ring-indigo-50' : plan.badge === 'Popular' || plan.badge === 'Best Value' ? 'border-gray-800' : 'border-gray-200'
              }`}>
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    plan.badge === 'Popular' ? 'bg-gray-900 text-white' : plan.badge === 'Best Value' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                  }`}>{plan.badge}</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: plan.color || '#6B7280' }} />
                  <h4 className="font-black text-gray-900 text-lg">{plan.displayName}</h4>
                </div>
                {isCurrent && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Current</span>}
              </div>

              {plan.description && (
                <p className="text-xs text-gray-500 mb-5 leading-relaxed min-h-[2.5rem]">{plan.description}</p>
              )}

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <p className="text-3xl font-black text-gray-900">{price === 0 ? 'Free' : fmtRs(price)}</p>
                  {price > 0 && <span className="text-xs text-gray-400 mb-1.5">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
                {monthlyEq && <p className="text-xs text-gray-400 mt-1">{fmtRs(monthlyEq)}/month equivalent</p>}
                {billingCycle === 'yearly' && discount > 0 && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">{discount}% savings vs monthly</span>
                )}
              </div>

              {/* Limits */}
              <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
                {[
                  { l: 'Branches',   v: plan.limits?.branches       },
                  { l: 'Staff',      v: plan.limits?.staff          },
                  { l: 'Tables',     v: plan.limits?.tables         },
                  { l: 'Orders/mo',  v: plan.limits?.monthlyOrders  },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between text-xs">
                    <span className="text-gray-400">{l}</span>
                    <span className="font-bold text-gray-700">{!v || v < 0 ? '∞ Unlimited' : v.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-1.5 mb-5">
                {Object.entries(FEATURE_META).map(([k, meta]) => {
                  const enabled = plan.features?.[k];
                  return (
                    <div key={k} className={`flex items-center gap-2 text-xs ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                      {enabled
                        ? <CheckCircle size={12} className="text-green-500 shrink-0" />
                        : <XCircle    size={12} className="text-gray-300 shrink-0" />}
                      {meta.label}
                    </div>
                  );
                })}
              </div>

              {showTrialBadge && (
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <Clock size={11} /> Free trial available — contact platform to activate
                </div>
              )}
              {isCurrent ? (
                <div className="w-full h-11 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center justify-center text-indigo-600 text-sm font-bold">
                  <CheckCircle size={14} className="mr-1.5" /> Current Plan
                </div>
              ) : isHighest && !isUpgrade ? null : (
                <button onClick={() => onUpgrade(plan, billingCycle, isUpgrade ? 'upgrade' : 'downgrade')}
                  className={`w-full h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    isUpgrade
                      ? 'bg-gray-900 hover:bg-gray-800 text-white'
                      : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  {isUpgrade ? <><ArrowUpCircle size={14} /> Upgrade to {plan.displayName}</> : <><ArrowDownCircle size={14} /> Downgrade</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-800">Full Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">Feature</th>
                {plans.map(p => (
                  <th key={p._id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || '#9CA3AF' }} />
                      <span className="text-xs font-bold text-gray-700">{p.displayName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(FEATURE_META).map(([k, meta]) => {
                const Icon = meta.icon;
                return (
                  <tr key={k} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{meta.label}</p>
                          <p className="text-[10px] text-gray-400">{meta.desc}</p>
                        </div>
                      </div>
                    </td>
                    {plans.map(p => (
                      <td key={p._id} className="px-4 py-3 text-center">
                        {p.features?.[k]
                          ? <CheckCircle size={16} className="text-green-500 mx-auto" />
                          : <XCircle    size={16} className="text-gray-200 mx-auto" />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB: BILLING CENTER
// ═════════════════════════════════════════════════════════════════════════════
const BillingTab = ({ onPayNow }) => {
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPag]        = useState({ total: 0, pages: 1 });
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const { data } = await api.get(`/subscription/invoices?${p}`);
      setInvoices(data.data || []);
      setPag(data.pagination || { total: 0, pages: 1 });
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const printInvoiceList = () => {
    // trigger per-invoice print from modal instead
    toast('Open an invoice and click Download for PDF', { icon: '📄' });
  };

  const hasFilters = search.trim() || statusFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-800">Billing Center</h3>
          <p className="text-xs text-gray-400 mt-0.5">{pagination.total} invoice{pagination.total !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search invoice number…" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), load())}
            className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-indigo-400 bg-white min-w-32">
          <option value="">All Statuses</option>
          {Object.entries(INVOICE_STATUS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <button onClick={() => { setPage(1); load(); }} className="h-10 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all">Search</button>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatus(''); setPage(1); }} className="h-10 px-4 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-sm transition-all">Clear</button>
        )}
      </div>

      {/* Invoice list */}
      {loading && invoices.length === 0 ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
          <Receipt size={36} className="mb-4 text-gray-300" />
          <p className="text-sm font-semibold">{hasFilters ? 'No invoices match your filters' : 'No invoices yet'}</p>
          <p className="text-xs mt-1">{hasFilters ? 'Try adjusting your search' : 'Invoices appear when you upgrade your plan'}</p>
          {hasFilters && <button onClick={() => { setSearch(''); setStatus(''); }} className="mt-4 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">Clear Filters</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const cfg      = INVOICE_STATUS[inv.status];
            const isOverdue = inv.status === 'open' && inv.dueDate && new Date(inv.dueDate) < new Date();
            return (
              <div key={inv._id}
                className={`bg-white flex items-center justify-between px-5 py-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${
                  isOverdue ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
                }`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    inv.status === 'paid' ? 'bg-green-100' : inv.status === 'open' ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <Receipt size={16} className={inv.status === 'paid' ? 'text-green-600' : inv.status === 'open' ? 'text-amber-600' : 'text-gray-400'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{inv.planId?.displayName || 'Subscription'} Plan</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg?.cls || ''}`}>{cfg?.label || inv.status}</span>
                      {isOverdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">OVERDUE</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {inv.invoiceNumber} · {fmtDate(inv.createdAt)}
                      {inv.dueDate && inv.status === 'open' && ` · Due ${fmtDate(inv.dueDate)}`}
                      {inv.paidAt && <span className="text-green-600"> · Paid {fmtDate(inv.paidAt)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <p className="text-base font-black text-gray-900">{fmtRs(inv.total)}</p>
                  <button onClick={() => setSelectedId(inv._id)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="View details">
                    <Eye size={15} />
                  </button>
                  {inv.status === 'open' && (
                    <button onClick={() => onPayNow(inv._id)} className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all">Pay</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-all"><ChevronLeft size={16} /></button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-all"><ChevronRight size={16} /></button>
        </div>
      )}

      {selectedId && (
        <InvoiceModal invoiceId={selectedId} onClose={() => setSelectedId(null)} onPay={id => { setSelectedId(null); onPayNow(id); }} />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB: PAYMENT CENTER
// ═════════════════════════════════════════════════════════════════════════════
const PaymentsTab = ({ preSelectInvoiceId }) => {
  const fileRef = useRef(null);

  const [invoices,   setInvoices]   = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [loadingPay, setLoadingPay] = useState(true);
  const [payPag,     setPayPag]     = useState({ total: 0, pages: 1 });
  const [payPage,    setPayPage]    = useState(1);

  const [selected,   setSelected]   = useState(null);
  const [receiptType,setReceiptType]= useState('screenshot');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [refNumber,  setRefNumber]  = useState('');
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [zoomedSrc,  setZoomedSrc]  = useState(null);

  const loadData = useCallback(async () => {
    setLoadingInv(true);
    setLoadingPay(true);
    try {
      const [invRes, payRes] = await Promise.all([
        api.get('/subscription/invoices?page=1&limit=20&status=open'),
        api.get(`/payments?page=${payPage}&limit=10`),
      ]);
      const open = invRes.data.data || [];
      setInvoices(open);
      setPayments(payRes.data.data || []);
      setPayPag(payRes.data.pagination || { total: 0, pages: 1 });

      if (preSelectInvoiceId && !selected) {
        // also check all invoices (not just open) for this id
        const found = open.find(i => i._id === preSelectInvoiceId);
        if (found) setSelected(found);
      }
    } catch { toast.error('Failed to load payment data'); }
    finally { setLoadingInv(false); setLoadingPay(false); }
  }, [payPage, preSelectInvoiceId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5 MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Only image files accepted'); return; }
    const reader = new FileReader();
    reader.onload = ev => { setReceiptUrl(ev.target.result); setReceiptPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selected)           { toast.error('Select an invoice'); return; }
    if (!receiptUrl.trim())  { toast.error('Upload a receipt or paste a URL'); return; }
    setSubmitting(true);
    try {
      await api.post('/payments', {
        invoiceId:      selected._id,
        receiptUrl,
        receiptType,
        referenceNumber: refNumber.trim(),
        submitterNotes:  notes,
      });
      toast.success('Payment submitted for review. You\'ll be notified within 24 hours.');
      setSelected(null); setReceiptUrl(''); setReceiptPreview(''); setRefNumber(''); setNotes('');
      if (fileRef.current) fileRef.current.value = '';
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async id => {
    if (!window.confirm('Cancel this payment submission?')) return;
    try { await api.delete(`/payments/${id}`); toast.success('Cancelled'); loadData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
  };

  const hasPending = payments.some(p => p.status === 'pending_review');

  return (
    <div className="space-y-8">
      {zoomedSrc && <ReceiptZoom src={zoomedSrc} onClose={() => setZoomedSrc(null)} />}

      {hasPending && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5">
          <Clock size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Payment Under Review</p>
            <p className="text-xs text-amber-600">You have a submission currently under review. You will be notified once approved.</p>
          </div>
        </div>
      )}

      {/* Submission form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 mb-5">Submit Payment Receipt</h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invoice select */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice to Pay</label>
            {loadingInv ? (
              <Skeleton className="h-10 w-full" />
            ) : invoices.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={15} className="text-green-500" /> No unpaid invoices — you're all good!
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => {
                  const isSel    = selected?._id === inv._id;
                  const isOD     = inv.dueDate && new Date(inv.dueDate) < new Date();
                  return (
                    <label key={inv._id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSel ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="inv" checked={isSel} onChange={() => setSelected(inv)} className="accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{inv.planId?.displayName || 'Subscription'} Plan</p>
                          <span className="text-[10px] font-mono text-gray-400">{inv.invoiceNumber}</span>
                          {isOD && <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">OVERDUE</span>}
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

          {invoices.length > 0 && (
            <>
              {/* Payment type */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
                <div className="flex gap-3">
                  {[
                    { val: 'screenshot',    label: 'App Screenshot', icon: Image    },
                    { val: 'bank_transfer', label: 'Bank Transfer',  icon: FileText },
                    { val: 'other',         label: 'Other',          icon: FileText },
                  ].map(({ val, label, icon: Icon }) => (
                    <label key={val}
                      className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${receiptType === val ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="type" value={val} checked={receiptType === val} onChange={() => setReceiptType(val)} className="accent-indigo-600" />
                      <Icon size={13} className="text-gray-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Receipt upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Receipt</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-all group">
                  {receiptPreview ? (
                    <div>
                      <img src={receiptPreview} alt="Receipt" className="max-h-44 mx-auto rounded-lg object-contain cursor-zoom-in"
                        onClick={e => { e.stopPropagation(); setZoomedSrc(receiptPreview); }} />
                      <div className="flex gap-2 justify-center mt-3">
                        <button type="button" onClick={e => { e.stopPropagation(); setZoomedSrc(receiptPreview); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition-all"><ZoomIn size={12} /> Zoom</button>
                        <button type="button" onClick={e => { e.stopPropagation(); setReceiptUrl(''); setReceiptPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs text-red-500 transition-all"><XCircle size={12} /> Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Upload size={28} className="group-hover:text-indigo-400 transition-colors" />
                      <p className="text-sm font-medium">Click to upload receipt image</p>
                      <p className="text-xs">PNG, JPG up to 5 MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <div className="mt-2">
                  <input type="url" placeholder="Or paste image URL: https://…" value={receiptUrl.startsWith('data:') ? '' : receiptUrl}
                    onChange={e => { setReceiptUrl(e.target.value); setReceiptPreview(e.target.value); }}
                    className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all" />
                </div>
              </div>

              {/* Reference number */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Reference Number <span className="font-normal normal-case text-gray-400">(Transaction ID / Cheque No.)</span>
                </label>
                <input type="text" placeholder="e.g. TXN-123456789" value={refNumber} onChange={e => setRefNumber(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Notes (Optional)</label>
                <textarea rows={2} placeholder="Any additional information for the reviewer…" value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all resize-none" />
              </div>

              <button type="submit" disabled={submitting || !selected || !receiptUrl}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                {submitting ? <><RefreshCw size={15} className="animate-spin" /> Submitting…</> : <><Upload size={15} /> Submit Payment for Review</>}
              </button>
              <p className="text-center text-xs text-gray-400">Typically reviewed within 1–24 hours. You will be notified on approval.</p>
            </>
          )}
        </form>
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-800">Payment History</h3>
          <span className="text-xs text-gray-400">{payPag.total} submission{payPag.total !== 1 ? 's' : ''}</span>
        </div>

        {loadingPay ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center py-12 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400">
            <CreditCard size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">No payment submissions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(p => {
              const cfg = PAYMENT_STATUS[p.status];
              return (
                <div key={p._id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === 'approved' ? 'bg-green-100' : p.status === 'rejected' ? 'bg-red-100' : p.status === 'pending_review' ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        {p.status === 'approved' ? <CheckCircle size={16} className="text-green-600" />
                          : p.status === 'rejected' ? <XCircle size={16} className="text-red-500" />
                          : p.status === 'pending_review' ? <Clock size={16} className="text-amber-600" />
                          : <AlertCircle size={16} className="text-gray-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{p.invoiceId?.invoiceNumber || 'Payment'}</p>
                          <span className="text-xs text-gray-400 capitalize">{p.receiptType?.replace('_', ' ')}</span>
                        </div>
                        {p.referenceNumber && <p className="text-xs text-indigo-600 font-mono mt-0.5">Ref: {p.referenceNumber}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                        {p.rejectionReason && <p className="text-xs text-red-500 mt-0.5">{p.rejectionReason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.receiptUrl && (
                        <div className="flex gap-1">
                          <button onClick={() => setZoomedSrc(p.receiptUrl)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" title="View receipt">
                            <ZoomIn size={14} />
                          </button>
                          <button onClick={() => { const a = document.createElement('a'); a.href = p.receiptUrl; a.download = `receipt-${p._id}.png`; a.click(); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Download">
                            <Download size={14} />
                          </button>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{fmtRs(p.amount)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg?.cls || ''}`}>{cfg?.label || p.status}</span>
                      </div>
                      {p.status === 'pending_review' && (
                        <button onClick={() => handleCancel(p._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Cancel">
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {payPag.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="text-sm text-gray-500">Page {payPage} of {payPag.pages}</span>
            <button onClick={() => setPayPage(p => Math.min(payPag.pages, p + 1))} disabled={payPage === payPag.pages} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
const SubscriptionPage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [sub,             setSub]             = useState(null);
  const [plans,           setPlans]           = useState([]);
  const [usage,           setUsage]           = useState(null);
  const [recentInvoices,  setRecentInvoices]  = useState([]);
  const [recentPayments,  setRecentPayments]  = useState([]);
  const [openInvoices,    setOpenInvoices]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [usageLoading,    setUsageLoading]    = useState(false);
  const [billingCycle,    setBillingCycle]    = useState('monthly');
  const [confirm,         setConfirm]         = useState(null);
  const [planModal,       setPlanModal]       = useState(null);
  const [acting,          setActing]          = useState(false);
  const [payPreSelect,    setPayPreSelect]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, invRes, payRes, openRes] = await Promise.all([
        api.get('/subscription'),
        api.get('/subscription/plans'),
        api.get('/subscription/invoices?limit=8'),
        api.get('/payments?limit=8'),
        api.get('/subscription/invoices?status=open&limit=10'),
      ]);
      setSub(sRes.data.data);
      setPlans(pRes.data.data || []);
      setRecentInvoices(invRes.data.data || []);
      setRecentPayments(payRes.data.data || []);
      setOpenInvoices(openRes.data.data || []);
    } catch {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    if (usage) return;
    setUsageLoading(true);
    try {
      const { data } = await api.get('/subscription/usage');
      setUsage(data.data);
    } catch {
      toast.error('Failed to load usage data');
    } finally {
      setUsageLoading(false);
    }
  }, [usage]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'usage') loadUsage();
    if (activeTab === 'overview' && !usage) loadUsage();
  }, [activeTab, loadUsage]);

  const handleTabSwitch = tab => {
    setActiveTab(tab);
  };

  const handleUpgrade = (plan, cycle, type) => {
    setPlanModal({ plan, cycle, type });
    setBillingCycle(cycle);
  };

  const handlePlanConfirm = async () => {
    if (!planModal) return;
    setActing(true);
    try {
      const { data } = await api.post('/subscription/upgrade', {
        planSlug: planModal.plan.slug,
        billingCycle,
      });
      toast.success(data.message || 'Invoice generated successfully');
      setPlanModal(null);
      if (data.data?.invoice?._id) {
        setPayPreSelect(data.data.invoice._id);
        setActiveTab('payments');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setActing(false);
    }
  };

  const handleAction = async (type) => {
    if (type === 'cancel')     setConfirm({ type: 'cancel' });
    if (type === 'reactivate') setConfirm({ type: 'reactivate' });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirm.type === 'cancel') {
        await api.post('/subscription/cancel', { reason: 'Cancelled by admin' });
        toast.success('Subscription cancelled. Access continues until period end.');
      } else if (confirm.type === 'reactivate') {
        await api.post('/subscription/reactivate');
        toast.success('Subscription reactivated successfully.');
      }
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const handlePayNow = invoiceId => {
    setPayPreSelect(invoiceId);
    setActiveTab('payments');
  };

  const subscription = sub?.subscription;
  const currentPlan  = subscription?.planId;
  const status       = subscription?.status || 'trial';
  const statusCfg    = STATUS_CFG[status] || STATUS_CFG.cancelled;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="max-w-6xl mx-auto flex gap-1 py-2">
            {TABS.map(t => <Skeleton key={t.id} className="h-9 w-24 rounded-lg" />)}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <div className="lg:col-span-2"><Skeleton className="h-64" /></div>
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {currentPlan?.color && <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: currentPlan.color }} />}
              <h1 className="text-xl font-black text-gray-900">{currentPlan?.displayName || 'Subscription'} Plan</h1>
              <StatusBadge status={status} />
              {currentPlan?.badge && (
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-indigo-600 text-white rounded-full uppercase tracking-wider">{currentPlan.badge}</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {sub?.restaurant?.name}
              {subscription?.billingCycle && ` · ${subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} billing`}
              {subscription?.currentPeriodEnd && ` · Renews ${fmtDate(subscription.currentPeriodEnd)}`}
            </p>
          </div>
          <button onClick={() => { setSub(null); setUsage(null); load(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm transition-all">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Critical Alerts ─────────────────────────────────────────────────────── */}
      {['past_due', 'suspended', 'expired'].includes(status) && (
        <div className={`px-6 py-3 ${status === 'suspended' ? 'bg-red-900' : 'bg-red-700'}`}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <AlertTriangle size={16} className="shrink-0" />
              <p className="text-sm font-bold">
                {status === 'past_due'  && 'Payment overdue — your account may be restricted soon'}
                {status === 'suspended' && 'Account suspended — please contact platform support'}
                {status === 'expired'   && 'Subscription expired — renew to restore full access'}
              </p>
            </div>
            {status !== 'suspended' && (
              <button onClick={() => handleTabSwitch('payments')}
                className="shrink-0 px-4 py-1.5 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition-all">Pay Now</button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Navigation ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}>
              <Icon size={14} />
              {label}
              {id === 'payments' && openInvoices.length > 0 && (
                <span className="ml-1 text-[9px] font-black text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">{openInvoices.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            sub={sub}
            usage={usage}
            recentInvoices={recentInvoices}
            recentPayments={recentPayments}
            openInvoices={openInvoices}
            onAction={handleAction}
            onTabSwitch={handleTabSwitch}
            plans={plans}
          />
        )}
        {activeTab === 'usage' && (
          <UsageTab usage={usage} loading={usageLoading} />
        )}
        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            currentPlan={currentPlan}
            onUpgrade={handleUpgrade}
            trialUsed={sub?.restaurant?.trialUsed}
            subStatus={status}
          />
        )}
        {activeTab === 'billing' && (
          <BillingTab onPayNow={handlePayNow} />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab preSelectInvoiceId={payPreSelect} />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {planModal && (
        <PlanChangeModal
          type={planModal.type}
          currentPlan={currentPlan}
          newPlan={planModal.plan}
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
          loading={acting}
          onConfirm={handlePlanConfirm}
          onClose={() => { setPlanModal(null); setActing(false); }}
        />
      )}
      {confirm?.type === 'cancel' && (
        <ConfirmModal
          title="Cancel Subscription?"
          message="Your plan stays active until the current period ends. You can reactivate at any time."
          confirmText="Cancel Plan"
          danger
          loading={acting}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'reactivate' && (
        <ConfirmModal
          title="Reactivate Subscription?"
          message={`This will reactivate your ${currentPlan?.displayName || ''} plan. A new ${subscription?.billingCycle === 'yearly' ? '1-year' : '1-month'} period will begin.`}
          confirmText="Reactivate"
          loading={acting}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

export default SubscriptionPage;
