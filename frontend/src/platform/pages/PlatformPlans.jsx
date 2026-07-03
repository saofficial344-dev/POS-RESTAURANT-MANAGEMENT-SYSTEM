import { useState, useEffect } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Archive, CheckCircle, XCircle, X, RefreshCw,
  Copy, Trash2, ToggleLeft, ToggleRight, Star,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const BLANK_PLAN = {
  name: '', slug: '', displayName: '', description: '',
  isActive: true, isPublic: true,
  badge: '',
  price: { monthly: 0, yearly: 0, currency: 'PKR' },
  trialDays: 14, sortOrder: 0, color: '#6366F1',
  limits: { branches: 1, staff: 10, tables: 20, monthlyOrders: 500, storageGB: 1, apiRequestsPerDay: 0 },
  features: {
    inventory: false, advancedReports: false, apiAccess: false, multiBranch: false,
    loyalty: false, delivery: true, kitchenDisplay: true, analytics: false,
    customDomain: false, prioritySupport: false, multipleAdmins: false, exportData: false,
  },
};

const FEATURE_LABELS = {
  inventory: 'Inventory', advancedReports: 'Advanced Reports', apiAccess: 'API Access',
  multiBranch: 'Multi-Branch', loyalty: 'Loyalty', delivery: 'Delivery',
  kitchenDisplay: 'Kitchen Display', analytics: 'Analytics', customDomain: 'Custom Domain',
  prioritySupport: 'Priority Support', multipleAdmins: 'Multiple Admins', exportData: 'Export Data',
};

const LIMIT_LABELS = {
  branches: 'Branches', staff: 'Staff', tables: 'Tables',
  monthlyOrders: 'Monthly Orders', storageGB: 'Storage (GB)', apiRequestsPerDay: 'API Req/Day',
};

const BADGE_OPTIONS = ['', 'Popular', 'Best Value', 'New', 'Enterprise'];
const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#6B7280',
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls  = 'w-full h-9 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 text-sm outline-none focus:border-indigo-500 transition-all placeholder-gray-600';
const labelCls  = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1';

// ── Plan Create / Edit Modal ───────────────────────────────────────────────────
const PlanModal = ({ plan, onClose, onSaved }) => {
  const isEdit = !!plan?._id;
  const [form, setForm]   = useState(plan ? JSON.parse(JSON.stringify(plan)) : BLANK_PLAN);
  const [saving, setSaving] = useState(false);

  const set = (path, value) => {
    setForm(prev => {
      const next  = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.displayName) {
      toast.error('Name, slug, and display name are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await platformAPI.put(`/plans/${plan._id}`, form);
        toast.success('Plan updated');
      } else {
        await platformAPI.post('/plans', form);
        toast.success('Plan created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-3xl p-6 my-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-black text-white">{isEdit ? 'Edit Plan' : 'Create Plan'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">

          {/* Basic info */}
          <div>
            <p className={`${labelCls} mb-3`}>Basic Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Basic" />
              </div>
              <div>
                <label className={labelCls}>Slug {isEdit && <span className="normal-case text-gray-600">(locked)</span>}</label>
                <input
                  className={`${inputCls} ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  placeholder="basic"
                  disabled={isEdit}
                />
              </div>
              <div>
                <label className={labelCls}>Display Name</label>
                <input className={inputCls} value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Basic Plan" />
              </div>
              <div>
                <label className={labelCls}>Sort Order</label>
                <input className={inputCls} type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief plan description..." />
              </div>
            </div>
          </div>

          {/* Badge + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Badge</label>
              <select
                className={`${inputCls} cursor-pointer`}
                value={form.badge || ''}
                onChange={e => set('badge', e.target.value)}
              >
                {BADGE_OPTIONS.map(b => (
                  <option key={b} value={b}>{b || 'None'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className={`w-6 h-6 rounded-full transition-all border-2 ${form.color === c ? 'border-white scale-125' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color || '#6366F1'}
                  onChange={e => set('color', e.target.value)}
                  className="w-6 h-6 rounded-full cursor-pointer border-2 border-gray-600 bg-transparent overflow-hidden"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p className={`${labelCls} mb-3`}>Pricing</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Monthly (PKR)</label>
                <input className={inputCls} type="number" min="0" value={form.price.monthly} onChange={e => set('price.monthly', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Yearly (PKR)</label>
                <input className={inputCls} type="number" min="0" value={form.price.yearly} onChange={e => set('price.yearly', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Trial Days</label>
                <input className={inputCls} type="number" min="0" value={form.trialDays} onChange={e => set('trialDays', Number(e.target.value))} />
              </div>
            </div>
            {form.price.monthly > 0 && form.price.yearly > 0 && (
              <p className="text-[11px] text-green-400 mt-2">
                Yearly saves {Math.round(((form.price.monthly * 12 - form.price.yearly) / (form.price.monthly * 12)) * 100)}% vs monthly
              </p>
            )}
          </div>

          {/* Limits */}
          <div>
            <p className={`${labelCls} mb-1`}>Resource Limits <span className="normal-case font-normal text-gray-600">(-1 = unlimited)</span></p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(LIMIT_LABELS).map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <input className={inputCls} type="number" min="-1" value={form.limits[k]} onChange={e => set(`limits.${k}`, Number(e.target.value))} />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <p className={`${labelCls} mb-3`}>Features</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(FEATURE_LABELS).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2.5 cursor-pointer group py-1">
                  <div
                    onClick={() => set(`features.${k}`, !form.features[k])}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                      form.features[k] ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 group-hover:border-gray-400'
                    }`}
                  >
                    {form.features[k] && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-6 pt-1 border-t border-gray-800">
            {[['isActive', 'Active'], ['isPublic', 'Publicly visible']].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => set(k, !form[k])}
                  className={`w-4 h-4 rounded border transition-all ${form[k] ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 group-hover:border-gray-400'}`}
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-300">{label}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
            >
              {saving ? 'Saving…' : isEdit ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const PlatformPlans = () => {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'create' | planObj
  const [acting,  setActing]  = useState(null); // planId being acted on

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await platformAPI.get('/plans');
      setPlans(data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleArchive = async (plan) => {
    if (!window.confirm(`Archive "${plan.name}"? It will no longer be shown for new subscriptions.`)) return;
    setActing(plan._id);
    try {
      await platformAPI.patch(`/plans/${plan._id}/archive`);
      toast.success(`${plan.name} archived`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleToggle = async (plan) => {
    setActing(plan._id);
    try {
      await platformAPI.patch(`/plans/${plan._id}/toggle`);
      toast.success(`${plan.name} ${plan.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleDuplicate = async (plan) => {
    setActing(plan._id);
    try {
      const { data } = await platformAPI.post(`/plans/${plan._id}/duplicate`);
      toast.success(data.message || 'Plan duplicated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Permanently delete "${plan.name}"? This cannot be undone.`)) return;
    setActing(plan._id);
    try {
      await platformAPI.delete(`/plans/${plan._id}`);
      toast.success(`${plan.name} deleted`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed — ' + (err.response?.data?.message || '')); }
    finally { setActing(null); }
  };

  const activePlans   = plans.filter(p => !p.isArchived);
  const archivedPlans = plans.filter(p =>  p.isArchived);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-white">Subscription Plans</h2>
          <p className="text-xs text-gray-600 mt-1">
            {activePlans.length} plan{activePlans.length !== 1 ? 's' : ''} · {archivedPlans.length} archived
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white disabled:opacity-50 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all"
          >
            <Plus size={16} /> New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : activePlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-gray-600">
          <Star size={28} className="mb-3" />
          <p className="text-sm font-semibold">No plans yet</p>
          <button onClick={() => setModal('create')} className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600">
            Create First Plan
          </button>
        </div>
      ) : (
        <>
          {/* Active Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {activePlans.map(plan => (
              <PlanCard
                key={plan._id}
                plan={plan}
                acting={acting === plan._id}
                onEdit={() => setModal(plan)}
                onToggle={() => handleToggle(plan)}
                onDuplicate={() => handleDuplicate(plan)}
                onArchive={() => handleArchive(plan)}
                onDelete={() => handleDelete(plan)}
              />
            ))}
          </div>

          {/* Archived Plans */}
          {archivedPlans.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">Archived Plans</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {archivedPlans.map(plan => (
                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    acting={acting === plan._id}
                    onEdit={() => setModal(plan)}
                    onToggle={() => handleToggle(plan)}
                    onDuplicate={() => handleDuplicate(plan)}
                    onArchive={() => handleArchive(plan)}
                    onDelete={() => handleDelete(plan)}
                    archived
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <PlanModal
          plan={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ── Plan Card ─────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, acting, onEdit, onToggle, onDuplicate, onArchive, onDelete, archived = false }) => (
  <div className={`relative bg-gray-800/50 border rounded-2xl p-5 transition-all ${
    plan.isActive && !archived ? 'border-gray-700/50 hover:border-gray-600/60' : 'border-gray-700/30'
  }`}>

    {/* Badge */}
    {plan.badge && (
      <div className="absolute -top-3 left-4">
        <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white"
          style={{ backgroundColor: plan.color || '#6366F1' }}>
          {plan.badge}
        </span>
      </div>
    )}

    {/* Plan header */}
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-700" style={{ backgroundColor: plan.color || '#6B7280' }} />
          <h3 className="font-black text-white text-sm">{plan.displayName}</h3>
        </div>
        <p className="text-[11px] text-gray-600 font-mono">{plan.slug}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {plan.isActive
          ? <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">ACTIVE</span>
          : <span className="text-[9px] font-bold text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">INACTIVE</span>
        }
        {plan.isPublic && (
          <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">PUBLIC</span>
        )}
        {archived && (
          <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">ARCHIVED</span>
        )}
      </div>
    </div>

    {/* Description */}
    <p className="text-xs text-gray-500 mb-4 min-h-[2rem] line-clamp-2">{plan.description || 'No description'}</p>

    {/* Pricing */}
    <div className="bg-gray-900/50 rounded-xl p-3 mb-4 space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Monthly</span>
        <span className="font-black text-white">{plan.price.monthly === 0 ? 'Free' : `Rs ${plan.price.monthly.toLocaleString()}`}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Yearly</span>
        <span className="font-bold text-gray-300">{plan.price.yearly === 0 ? 'Free' : `Rs ${plan.price.yearly.toLocaleString()}`}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Trial</span>
        <span className="text-gray-400">{plan.trialDays} days</span>
      </div>
    </div>

    {/* Limits */}
    <div className="mb-4">
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-2">Limits</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {Object.entries(LIMIT_LABELS).map(([k, label]) => (
          <div key={k} className="flex justify-between text-[11px]">
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-400 font-semibold">{plan.limits[k] < 0 ? '∞' : plan.limits[k].toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Features */}
    <div className="flex flex-wrap gap-1 mb-5 min-h-[1.5rem]">
      {Object.entries(plan.features || {}).filter(([, v]) => v).map(([k]) => (
        <span key={k} className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-semibold border border-indigo-500/20">
          {FEATURE_LABELS[k] || k}
        </span>
      ))}
      {Object.values(plan.features || {}).every(v => !v) && (
        <span className="text-[10px] text-gray-700">No features enabled</span>
      )}
    </div>

    {/* Actions */}
    <div className="flex gap-1.5 border-t border-gray-700/50 pt-4">
      {/* Edit */}
      <button
        onClick={onEdit}
        disabled={acting}
        title="Edit"
        className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
      >
        <Edit2 size={12} /> Edit
      </button>

      {/* Toggle active */}
      <button
        onClick={onToggle}
        disabled={acting}
        title={plan.isActive ? 'Deactivate' : 'Activate'}
        className={`p-2 rounded-lg text-xs transition-all disabled:opacity-40 ${
          plan.isActive
            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
        }`}
      >
        {plan.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        disabled={acting}
        title="Duplicate"
        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-all disabled:opacity-40"
      >
        <Copy size={13} />
      </button>

      {/* Archive */}
      {!archived && (
        <button
          onClick={onArchive}
          disabled={acting}
          title="Archive"
          className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-all disabled:opacity-40"
        >
          <Archive size={13} />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={acting}
        title="Delete (only if unused)"
        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-40"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

export default PlatformPlans;
