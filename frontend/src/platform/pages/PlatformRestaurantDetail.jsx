import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import platformAPI from '../services/platformApi';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Building2, GitBranch, Users, ShoppingBag, DollarSign,
  PauseCircle, PlayCircle, Trash2, Edit3, KeyRound, RefreshCw,
  Copy, Check, Eye, EyeOff, AlertTriangle, CheckCircle2, X,
  Star, Clock, Calendar, Globe, Landmark, Phone, Mail, MapPin,
  User, Activity, Shield, CreditCard, ChevronDown, ChevronRight,
  ExternalLink, Settings, RotateCcw, FileText, Banknote, History,
  Loader2,
} from 'lucide-react';

// ── Utility ───────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

// ── Shared UI ─────────────────────────────────────────────────────────────────
const STAT = ({ icon: Icon, label, value, color = 'text-indigo-400' }) => (
  <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color.replace('text-', 'bg-').replace('400', '400/10')}`}>
      <Icon size={16} className={color} />
    </div>
    <p className="text-2xl font-black text-white">{value ?? '—'}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const Row = ({ label, value, mono, accent }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-700/30 last:border-0">
    <span className="text-xs text-gray-500 shrink-0 mt-0.5">{label}</span>
    <span className={`text-xs text-right font-medium ${mono ? 'font-mono' : ''} ${accent || 'text-gray-300'}`}>{value ?? '—'}</span>
  </div>
);

const InfoCard = ({ title, children, action }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
      {action}
    </div>
    <div>{children}</div>
  </div>
);

const Badge = ({ label, cls }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
    {label}
  </span>
);

const STATUS_MAP = {
  active:     { cls: 'text-green-400  bg-green-400/10  border-green-400/20',  label: 'Active'     },
  suspended:  { cls: 'text-red-400    bg-red-400/10    border-red-400/20',    label: 'Suspended'  },
  onboarding: { cls: 'text-amber-400  bg-amber-400/10  border-amber-400/20',  label: 'Onboarding' },
  deleted:    { cls: 'text-gray-500   bg-gray-700      border-transparent',   label: 'Deleted'    },
};
const PLAN_STATUS_MAP = {
  trial:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  active:    'text-green-400 bg-green-400/10 border-green-400/20',
  expired:   'text-red-400   bg-red-400/10   border-red-400/20',
  cancelled: 'text-gray-500  bg-gray-700     border-transparent',
  past_due:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  suspended: 'text-red-400   bg-red-400/10   border-red-400/20',
};

// ── Delete Modal (2-step: name confirm → platform admin password) ─────────────
const DeleteModal = ({ restaurantName, platformAdminName, platformAdminEmail, onConfirm, onClose, loading }) => {
  const [typed,    setTyped]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [step,     setStep]     = useState(1);

  const nameOk = typed === restaurantName;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">Permanently Delete Restaurant</h3>
              <p className="text-xs text-red-400/80">Step {step} of 2 — This action is irreversible</p>
            </div>
          </div>
        </div>

        {/* Step 1: confirm restaurant name */}
        {step === 1 && (
          <>
            <div className="p-6 space-y-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-xs text-red-300 space-y-2">
                <p className="font-bold text-red-400">PERMANENT DELETION — ALL DATA WILL BE DESTROYED</p>
                <ul className="space-y-1 list-disc list-inside text-red-300/80">
                  <li>All users: Admin, Manager, Cashier, Waiter, Kitchen</li>
                  <li>All branches, tables, orders, bills</li>
                  <li>All categories, menu items, settings</li>
                  <li>All invoices, payments, subscriptions</li>
                  <li>All notifications, API keys, refresh tokens</li>
                  <li>All active sessions and cached data</li>
                </ul>
                <p className="text-red-400 font-semibold mt-1">There is no undo. There is no recovery.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Type <span className="text-red-400 font-mono">{restaurantName}</span> to continue
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder="Type restaurant name exactly…"
                  autoFocus
                  className="w-full h-10 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 text-sm outline-none focus:border-red-500 transition-all placeholder:text-gray-600"
                />
                {typed.length > 0 && !nameOk && (
                  <p className="text-xs text-red-500 mt-1">Name does not match</p>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm font-medium hover:text-white transition-colors">Cancel</button>
              <button onClick={() => setStep(2)} disabled={!nameOk}
                className="flex-1 h-10 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Platform Super Admin password verification */}
        {step === 2 && (
          <>
            <div className="p-6 space-y-4">

              {/* Who is being verified */}
              <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={15} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Authorizing as Platform Super Admin</p>
                  <p className="text-sm font-semibold text-white truncate">{platformAdminName || 'Platform Admin'}</p>
                  {platformAdminEmail && (
                    <p className="text-xs text-gray-500 font-mono truncate">{platformAdminEmail}</p>
                  )}
                </div>
              </div>

              {/* Warning: NOT the restaurant admin */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Enter <span className="font-bold text-amber-200">your own Platform Super Admin password</span> — not the restaurant admin&apos;s password.
                  The restaurant&apos;s credentials are not involved in this step.
                </p>
              </div>

              {/* Final warning */}
              <div className="bg-red-900/25 border border-red-500/30 rounded-xl p-3.5">
                <p className="text-xs text-red-300">
                  Permanently deleting <span className="font-bold text-white">{restaurantName}</span> and every record associated with it.
                  This operation is logged and cannot be undone.
                </p>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Platform Super Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your Platform Admin password…"
                    autoFocus
                    autoComplete="current-password"
                    onKeyDown={e => { if (e.key === 'Enter' && password && !loading) onConfirm(password); }}
                    className="w-full h-11 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 pr-11 text-sm outline-none focus:border-red-500 transition-all placeholder:text-gray-600"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setStep(1)} disabled={loading}
                className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm font-medium hover:text-white transition-colors disabled:opacity-50">
                ← Back
              </button>
              <button onClick={() => onConfirm(password)} disabled={!password || loading}
                className="flex-1 h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting all data…</>
                  : <><Trash2 size={14} /> Permanently Delete</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Reset Password Modal ──────────────────────────────────────────────────────
const ResetPasswordModal = ({ restaurantName, adminName, onConfirm, onClose, loading, result }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState({});

  const copy = async (key, val) => {
    await navigator.clipboard.writeText(val).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 pb-4 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-base">Password Reset Successfully</h3>
                <p className="text-xs text-gray-500">Share securely — shown only once</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="bg-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</p>
              <div className="flex items-center justify-between">
                <p className="text-white font-mono text-sm">{result.username}</p>
                <button onClick={() => copy('u', result.username)} className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all">
                  {copied.u ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Temporary Password</p>
              <div className="flex items-center justify-between">
                <p className="text-white font-mono text-sm tracking-widest">{visible ? result.temporaryPassword : '•'.repeat(result.temporaryPassword?.length ?? 12)}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setVisible(v => !v)} className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all">
                    {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copy('p', result.temporaryPassword)} className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all">
                    {copied.p ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
              The admin will be forced to change this password on next login.
            </div>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <KeyRound size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-base">Reset Admin Password</h3>
              <p className="text-xs text-gray-500">{restaurantName}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Admin Username</p>
            <p className="text-white font-mono text-sm">{adminName || '—'}</p>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>A new temporary password will be generated automatically.</p>
            <p>The admin will be required to change it on next login.</p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm font-medium hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting…</> : <><KeyRound size={14} /> Generate New Password</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Restaurant Modal ─────────────────────────────────────────────────────
const EditModal = ({ restaurant, onSave, onClose }) => {
  const [form, setForm]   = useState({
    name:         restaurant.name || '',
    email:        restaurant.email || '',
    phone:        restaurant.phone || '',
    ownerName:    restaurant.ownerName || '',
    businessType: restaurant.businessType || 'restaurant',
    address:      restaurant.address?.street || '',
    city:         restaurant.address?.city || '',
    country:      restaurant.address?.country || 'Pakistan',
    timezone:     restaurant.timezone || 'Asia/Karachi',
    currency:     restaurant.currency || 'PKR',
    taxRate:      restaurant.taxRate ?? 0,
    maxBranches:  restaurant.maxBranches ?? 1,
    maxUsers:     restaurant.maxUsers ?? 10,
    notes:        restaurant.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Restaurant name is required'); return; }
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full h-10 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600';
  const label = (text, req) => (
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
      {text} {req && <span className="text-red-500 normal-case font-normal">*</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-gray-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Edit3 size={16} className="text-indigo-400" />
            </div>
            <h3 className="text-white font-black text-base">Edit Restaurant</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-600 hover:text-gray-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {label('Restaurant Name', true)}
              <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Owner / Business Name')}
              <input value={form.ownerName} onChange={e => f('ownerName', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Business Type')}
              <select value={form.businessType} onChange={e => f('businessType', e.target.value)} className={inputCls}>
                {['restaurant','cafe','hotel','bakery','food_truck','cloud_kitchen','other'].map(v => (
                  <option key={v} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              {label('Contact Email')}
              <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Phone')}
              <input value={form.phone} onChange={e => f('phone', e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              {label('Address')}
              <input value={form.address} onChange={e => f('address', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('City')}
              <input value={form.city} onChange={e => f('city', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Country')}
              <input value={form.country} onChange={e => f('country', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Timezone')}
              <input value={form.timezone} onChange={e => f('timezone', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Currency')}
              <input value={form.currency} onChange={e => f('currency', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Max Branches')}
              <input type="number" min="1" value={form.maxBranches} onChange={e => f('maxBranches', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Max Staff')}
              <input type="number" min="1" value={form.maxUsers} onChange={e => f('maxUsers', e.target.value)} className={inputCls} />
            </div>
            <div>
              {label('Tax Rate (%)')}
              <input type="number" min="0" max="100" value={form.taxRate} onChange={e => f('taxRate', e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              {label('Internal Notes')}
              <textarea rows={2} value={form.notes} onChange={e => f('notes', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600 resize-none" />
            </div>
          </div>
        </div>
        <div className="p-6 pt-4 border-t border-gray-700/50 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm font-medium hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const PlatformRestaurantDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { platformAdmin } = usePlatformAuth();
  const currentAdmin = platformAdmin?.admin ?? {};

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [tab,     setTab]     = useState('overview');

  const [showEdit,      setShowEdit]      = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReset,     setShowReset]     = useState(false);
  const [resetLoading,  setResetLoading]  = useState(false);
  const [resetResult,   setResetResult]   = useState(null);

  const [tabData,    setTabData]    = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const loadedTabs = useRef(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await platformAPI.get(`/restaurants/${id}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load restaurant');
      navigate('/platform/restaurants');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSuspend = async () => {
    if (!window.confirm(`Suspend "${data.restaurant.name}"? All logins will be blocked.`)) return;
    setActing(true);
    try {
      await platformAPI.patch(`/restaurants/${id}/suspend`, { reason: 'Suspended by platform admin' });
      toast.success('Restaurant suspended');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleActivate = async () => {
    setActing(true);
    try {
      await platformAPI.patch(`/restaurants/${id}/activate`);
      toast.success('Restaurant activated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleEdit = async (form) => {
    try {
      await platformAPI.patch(`/restaurants/${id}`, form);
      toast.success('Restaurant updated');
      setShowEdit(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
      throw err;
    }
  };

  const handleDelete = async (adminPassword) => {
    setDeleteLoading(true);
    try {
      await platformAPI.delete(`/restaurants/${id}`, {
        data: { adminPassword, reason: 'Permanently deleted by platform super admin' },
      });
      toast.success(`Restaurant permanently deleted — all data removed`);
      navigate('/platform/restaurants');
    } catch (err) {
      const d = err.response?.data;
      if (d?.failedCollection) {
        toast.error(`Deletion failed at: ${d.failedCollection} — ${d.error || 'Unknown error'}`);
      } else {
        toast.error(d?.message || d?.error || 'Deletion failed');
      }
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    try {
      const { data: res } = await platformAPI.post(`/restaurants/${id}/reset-admin-password`);
      setResetResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const loadTabData = useCallback(async (tabId) => {
    if (loadedTabs.current.has(tabId)) return;
    loadedTabs.current.add(tabId);
    setTabLoading(p => ({ ...p, [tabId]: true }));
    try {
      let result;
      if (tabId === 'users') {
        const { data: res } = await platformAPI.get(`/restaurants/${id}/users?limit=100`);
        result = res.data;
      } else if (tabId === 'invoices') {
        const { data: res } = await platformAPI.get(`/invoices?restaurantId=${id}&limit=100`);
        result = res.data;
      } else if (tabId === 'payments') {
        const { data: res } = await platformAPI.get(`/payments?restaurantId=${id}&limit=100`);
        result = res.data;
      } else if (tabId === 'auditLogs') {
        const { data: res } = await platformAPI.get(`/audit-logs?targetId=${id}&limit=100`);
        result = res.data;
      }
      setTabData(p => ({ ...p, [tabId]: result ?? [] }));
    } catch {
      loadedTabs.current.delete(tabId); // allow retry on error
      setTabData(p => ({ ...p, [tabId]: [] }));
    } finally {
      setTabLoading(p => ({ ...p, [tabId]: false }));
    }
  }, [id]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    const LAZY_TABS = ['users', 'invoices', 'payments', 'auditLogs'];
    if (LAZY_TABS.includes(tabId)) loadTabData(tabId);
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-800 rounded" />
        <div className="h-6 w-48 bg-gray-800 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  const r   = data.restaurant;
  const s   = data.stats;
  const st  = STATUS_MAP[r.status] || STATUS_MAP.active;
  const sub = data.subscription;
  const adm = data.adminUser;
  const isDeleted = r.status === 'deleted';

  const TABS = [
    { id: 'overview',    label: 'Overview'     },
    { id: 'credentials', label: 'Credentials'  },
    { id: 'subscription',label: 'Subscription' },
    { id: 'branches',    label: 'Branches'     },
    { id: 'users',       label: 'Users'        },
    { id: 'invoices',    label: 'Invoices'     },
    { id: 'payments',    label: 'Payments'     },
    { id: 'auditLogs',   label: 'Audit Logs'   },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/platform/restaurants')}
            className="mt-1 p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-black text-white">{r.name}</h2>
              <Badge label={st.label} cls={st.cls} />
              {r.planStatus && (
                <Badge label={`${r.planStatus} · ${r.plan}`} cls={`border-transparent ${PLAN_STATUS_MAP[r.planStatus] || 'text-gray-400 bg-gray-700'}`} />
              )}
              {adm?.mustChangePassword && (
                <Badge label="Password Change Required" cls="text-orange-400 bg-orange-400/10 border-orange-400/20" />
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 font-mono">{r.slug}</p>
          </div>
        </div>

        {/* Action buttons */}
        {!isDeleted && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm font-semibold transition-all">
              <Edit3 size={14} /> Edit
            </button>
            <button onClick={() => setShowReset(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl text-sm font-semibold transition-all">
              <KeyRound size={14} /> Reset Password
            </button>
            {r.status !== 'suspended' ? (
              <button onClick={handleSuspend} disabled={acting}
                className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                <PauseCircle size={14} /> Suspend
              </button>
            ) : (
              <button onClick={handleActivate} disabled={acting}
                className="flex items-center gap-2 px-3.5 py-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                <PlayCircle size={14} /> Activate
              </button>
            )}
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <STAT icon={GitBranch}   label="Branches"      value={s.branchCount}    color="text-blue-400" />
        <STAT icon={Users}       label="Staff Users"   value={s.userCount}      color="text-indigo-400" />
        <STAT icon={ShoppingBag} label="Total Orders"  value={s.orderCount}     color="text-amber-400" />
        <STAT icon={DollarSign}  label="Total Revenue" value={`Rs ${Math.round(s.totalRevenue || 0).toLocaleString()}`} color="text-green-400" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 mb-5 bg-gray-800/50 border border-gray-700/50 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="Restaurant Info">
            <Row label="Business Type" value={r.businessType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
            <Row label="Owner / Entity" value={r.ownerName} />
            <Row label="Tax Rate"      value={r.taxRate != null ? `${r.taxRate}%` : '—'} />
            <Row label="Currency"      value={r.currency} />
            <Row label="Timezone"      value={r.timezone} />
            <Row label="Status"        value={r.status} />
            <Row label="Created"       value={fmtDate(r.createdAt)} />
          </InfoCard>

          <InfoCard title="Contact & Location">
            <Row label="Email"   value={r.email || '—'} />
            <Row label="Phone"   value={r.phone || '—'} />
            <Row label="Address" value={r.address?.street || '—'} />
            <Row label="City"    value={r.address?.city || '—'} />
            <Row label="Country" value={r.address?.country || '—'} />
          </InfoCard>

          <InfoCard title="Resource Limits">
            <Row label="Max Branches" value={r.maxBranches} />
            <Row label="Max Staff"    value={r.maxUsers} />
            <Row label="Branches Used" value={s.branchCount} />
            <Row label="Staff Used"   value={s.userCount} />
          </InfoCard>

          {r.notes && (
            <InfoCard title="Internal Notes">
              <p className="text-xs text-gray-400 leading-relaxed">{r.notes}</p>
            </InfoCard>
          )}

          {/* Feature flags */}
          <div className="md:col-span-2">
            <InfoCard title="Enabled Features">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(r.features || {}).map(([k, v]) => (
                  <div key={k} className={`flex items-center gap-2 text-xs ${v ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v ? 'bg-green-400' : 'bg-gray-700'}`} />
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        </div>
      )}

      {/* ══ CREDENTIALS TAB ══ */}
      {tab === 'credentials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard
            title="Admin Account"
            action={
              !isDeleted && (
                <button onClick={() => setShowReset(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all">
                  <KeyRound size={12} /> Reset Password
                </button>
              )
            }>
            {!adm ? (
              <p className="text-xs text-gray-600 py-4 text-center">No admin user found</p>
            ) : (
              <>
                <Row label="Username"   value={adm.name} mono />
                <Row label="Email"      value={adm.email || '—'} />
                <Row label="Role"       value="Admin" />
                <Row label="Status"     value={adm.status} accent={adm.status === 'active' ? 'text-green-400' : 'text-red-400'} />
                <Row label="Last Login" value={fmtDateTime(adm.lastLoginAt)} />
                <Row label="Last IP"    value={adm.lastLoginIp || '—'} mono />
                <Row label="Created"    value={fmtDate(adm.createdAt)} />
                <Row label="Must Change Password"
                  value={adm.mustChangePassword ? 'Yes — forced on next login' : 'No'}
                  accent={adm.mustChangePassword ? 'text-orange-400' : 'text-gray-300'} />
              </>
            )}
          </InfoCard>

          <InfoCard title="Security Info">
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl p-3">
                <Shield size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                <p>Passwords are stored using bcrypt hashing (12 salt rounds). Existing passwords are never exposed.</p>
              </div>
              <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl p-3">
                <KeyRound size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p>Resetting generates a temporary password. The admin must change it on next login.</p>
              </div>
              <div className="flex items-start gap-2 bg-gray-800/50 rounded-xl p-3">
                <Activity size={14} className="text-green-400 shrink-0 mt-0.5" />
                <p>Every password reset is logged in the platform audit trail.</p>
              </div>
            </div>
          </InfoCard>
        </div>
      )}

      {/* ══ SUBSCRIPTION TAB ══ */}
      {tab === 'subscription' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="Current Subscription">
            <Row label="Plan"         value={sub?.planId?.displayName || r.plan} />
            <Row label="Plan Status"  value={r.planStatus} accent={r.planStatus === 'active' ? 'text-green-400' : r.planStatus === 'trial' ? 'text-amber-400' : 'text-red-400'} />
            <Row label="Status"       value={sub?.status} />
            <Row label="Billing"      value={sub?.billingCycle || '—'} />
            <Row label="Period Start" value={fmtDate(sub?.currentPeriodStart)} />
            <Row label="Period End"   value={fmtDate(sub?.currentPeriodEnd)} />
            <Row label="Trial End"    value={sub?.trialEnd ? fmtDate(sub.trialEnd) : '—'} />
            <Row label="Auto Renew"   value={sub?.autoRenew ? 'Yes' : 'No'} accent={sub?.autoRenew ? 'text-green-400' : 'text-gray-400'} />
            {sub?.cancelledAt && <Row label="Cancelled At" value={fmtDate(sub.cancelledAt)} accent="text-red-400" />}
            {sub?.cancelReason && <Row label="Cancel Reason" value={sub.cancelReason} />}
          </InfoCard>

          <InfoCard title="Plan Limits">
            {sub?.planId?.limits ? (
              <>
                <Row label="Branches"        value={sub.planId.limits.branches < 0 ? 'Unlimited' : sub.planId.limits.branches} />
                <Row label="Staff"           value={sub.planId.limits.staff < 0 ? 'Unlimited' : sub.planId.limits.staff} />
                <Row label="Tables"          value={sub.planId.limits.tables < 0 ? 'Unlimited' : sub.planId.limits.tables} />
                <Row label="Monthly Orders"  value={sub.planId.limits.monthlyOrders < 0 ? 'Unlimited' : sub.planId.limits.monthlyOrders} />
                <Row label="Storage (GB)"    value={sub.planId.limits.storageGB < 0 ? 'Unlimited' : sub.planId.limits.storageGB} />
                <Row label="API Req/Day"     value={sub.planId.limits.apiRequestsPerDay < 0 ? 'Unlimited' : sub.planId.limits.apiRequestsPerDay} />
              </>
            ) : (
              <p className="text-xs text-gray-600 py-4 text-center">No subscription found</p>
            )}
          </InfoCard>

          {sub?.planId?.features && (
            <div className="md:col-span-2">
              <InfoCard title="Plan Features">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(sub.planId.features).map(([k, v]) => (
                    <div key={k} className={`flex items-center gap-2 text-xs ${v ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v ? 'bg-green-400' : 'bg-gray-700'}`} />
                      {k.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  ))}
                </div>
              </InfoCard>
            </div>
          )}
        </div>
      )}

      {/* ══ BRANCHES TAB ══ */}
      {tab === 'branches' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
          {!data.branches?.length ? (
            <p className="text-center text-gray-600 text-sm py-12">No branches found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Name', 'Code', 'City', 'Manager', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {data.branches.map(b => (
                  <tr key={b._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">{b.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{b.branchCode || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400">{b.city || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400">{b.managerId?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-700'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ USERS TAB ══ */}
      {tab === 'users' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
          {tabLoading.users ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading users…
            </div>
          ) : !tabData.users?.length ? (
            <p className="text-center text-gray-600 text-sm py-12">No users found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Name', 'Email', 'Role', 'Branch', 'Status', 'Last Login', 'Flags'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {tabData.users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white font-mono text-xs">{u.name}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{u.email || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 capitalize">{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{u.branchId?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-5 py-3.5">
                      {u.mustChangePassword && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400">Pwd Reset</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ INVOICES TAB ══ */}
      {tab === 'invoices' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
          {tabLoading.invoices ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading invoices…
            </div>
          ) : !tabData.invoices?.length ? (
            <p className="text-center text-gray-600 text-sm py-12">No invoices found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Invoice #', 'Plan', 'Period', 'Amount', 'Status', 'Due Date', 'Paid At'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {tabData.invoices.map(inv => {
                  const INV_CLS = {
                    paid:    'text-green-400 bg-green-400/10',
                    open:    'text-amber-400 bg-amber-400/10',
                    void:    'text-gray-500 bg-gray-700',
                    overdue: 'text-red-400 bg-red-400/10',
                  };
                  return (
                    <tr key={inv._id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{inv.invoiceNumber || inv._id?.slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3.5 text-gray-300 text-xs">{inv.planId?.displayName || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(inv.billingPeriodStart)} – {fmtDate(inv.billingPeriodEnd)}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{inv.currency} {inv.total?.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INV_CLS[inv.status] || 'text-gray-400 bg-gray-700'}`}>{inv.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{inv.paidAt ? fmtDate(inv.paidAt) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ PAYMENTS TAB ══ */}
      {tab === 'payments' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
          {tabLoading.payments ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading payments…
            </div>
          ) : !tabData.payments?.length ? (
            <p className="text-center text-gray-600 text-sm py-12">No payments found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Ref #', 'Method', 'Amount', 'Status', 'Invoice', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {tabData.payments.map(p => (
                  <tr key={p._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{p.referenceNumber || p._id?.slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-3.5 text-gray-300 capitalize text-xs">{p.method || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-white">{p.currency} {p.amount?.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'text-green-400 bg-green-400/10' : p.status === 'pending' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{p.invoiceId?.invoiceNumber || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDateTime(p.paidAt || p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ AUDIT LOGS TAB ══ */}
      {tab === 'auditLogs' && (
        <div className="space-y-2">
          {tabLoading.auditLogs ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading audit logs…
            </div>
          ) : !tabData.auditLogs?.length ? (
            <p className="text-center text-gray-600 text-sm py-12">No audit log entries found for this restaurant</p>
          ) : tabData.auditLogs.map(log => (
            <div key={log._id} className="bg-gray-800/50 border border-gray-700/30 rounded-xl px-4 py-3 flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={13} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{log.action?.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-gray-600 shrink-0">{fmtDateTime(log.createdAt)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  by {log.actorId?.name || log.actorEmail || 'System'}
                  {log.ipAddress && <span className="font-mono text-gray-600 ml-2">{log.ipAddress}</span>}
                </p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <p className="text-[10px] text-gray-600 mt-1 font-mono truncate">{JSON.stringify(log.metadata)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showEdit && (
        <EditModal restaurant={r} onSave={handleEdit} onClose={() => setShowEdit(false)} />
      )}
      {showDelete && (
        <DeleteModal
          restaurantName={r.name}
          platformAdminName={currentAdmin.name}
          platformAdminEmail={currentAdmin.email}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
      {showReset && (
        <ResetPasswordModal
          restaurantName={r.name}
          adminName={adm?.name}
          loading={resetLoading}
          result={resetResult}
          onConfirm={handleResetPassword}
          onClose={() => { setShowReset(false); setResetResult(null); }}
        />
      )}
    </div>
  );
};

export default PlatformRestaurantDetail;
