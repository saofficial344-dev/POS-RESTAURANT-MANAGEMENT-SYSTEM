import { useState, useEffect } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import { Plus, Edit2, ToggleLeft, ToggleRight, RefreshCw, Flag, X } from 'lucide-react';

const CATEGORIES = ['general', 'billing', 'operations', 'analytics', 'integrations', 'security'];
const CATEGORY_CLS = {
  general:      'text-gray-400   bg-gray-700',
  billing:      'text-green-400  bg-green-400/10',
  operations:   'text-blue-400   bg-blue-400/10',
  analytics:    'text-indigo-400 bg-indigo-400/10',
  integrations: 'text-violet-400 bg-violet-400/10',
  security:     'text-amber-400  bg-amber-400/10',
};

const BLANK_FLAG = {
  key: '', name: '', description: '', category: 'operations', type: 'boolean', defaultValue: false, isActive: true,
};

const FlagModal = ({ flag, onClose, onSaved }) => {
  const isEdit = !!flag?._id;
  const [form, setForm] = useState(flag ? { ...flag } : BLANK_FLAG);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.key || !form.name) { toast.error('Key and name required'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await platformAPI.put(`/feature-flags/${flag._id}`, form);
        toast.success('Flag updated');
      } else {
        await platformAPI.post('/feature-flags', form);
        toast.success('Flag created');
      }
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full h-9 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">{isEdit ? 'Edit Flag' : 'Create Feature Flag'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Key (immutable)</label>
            <input className={inputCls} value={form.key} onChange={e => set('key', e.target.value.toLowerCase().replace(/\s/g, '_'))}
              placeholder="feature_key" disabled={isEdit} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Feature name" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500">
                <option value="boolean">Boolean</option>
                <option value="limit">Limit</option>
                <option value="string">String</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => set('isActive', !form.isActive)}
              className={`w-4 h-4 rounded border transition-all cursor-pointer ${form.isActive ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600'}`} />
            <span className="text-sm text-gray-400">Active</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlatformFeatureFlags = () => {
  const [flags, setFlags]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [catFilter, setCat]     = useState('');
  const [modal, setModal]       = useState(null);
  const [togglingId, setToggle] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (catFilter) p.set('category', catFilter);
      const { data } = await platformAPI.get(`/feature-flags?${p}`);
      setFlags(data.data || []);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [catFilter]);

  const handleToggle = async (flag) => {
    setToggle(flag._id);
    try {
      await platformAPI.patch(`/feature-flags/${flag._id}/toggle`);
      toast.success(`"${flag.name}" ${flag.isActive ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setToggle(null); }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = flags.filter(f => f.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Feature Flags</h2>
          <p className="text-xs text-gray-600 mt-1">Control feature availability per plan and restaurant</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all">
            <Plus size={16} /> New Flag
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setCat('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!catFilter ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c === catFilter ? '' : c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${catFilter === c ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-gray-600">
          <Flag size={32} className="mb-3 text-gray-700" />
          <p className="text-sm">No feature flags found</p>
          <button onClick={() => setModal('create')} className="mt-3 text-indigo-400 text-sm">Create first flag</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${CATEGORY_CLS[cat] || 'text-gray-400 bg-gray-700'}`}>{cat}</span>
                <span className="text-xs text-gray-600">{items.length} flags</span>
              </div>
              <div className="space-y-2">
                {items.map(flag => (
                  <div key={flag._id}
                    className={`flex items-center justify-between bg-gray-800/50 border rounded-xl px-4 py-3 transition-all ${flag.isActive ? 'border-gray-700/50' : 'border-gray-700/30 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{flag.name}</p>
                        <span className="font-mono text-[10px] text-gray-600">{flag.key}</span>
                        <span className="text-[9px] text-gray-600 bg-gray-700 px-1.5 py-0.5 rounded capitalize">{flag.type}</span>
                      </div>
                      {flag.description && <p className="text-xs text-gray-600 mt-0.5 truncate">{flag.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {flag.planOverrides?.map(o => (
                          <span key={o.planSlug} className="text-[10px] text-gray-500">
                            <span className="text-gray-400 capitalize">{o.planSlug}</span>: {String(o.value)}
                          </span>
                        ))}
                        {flag.restaurantOverrides?.length > 0 && (
                          <span className="text-[10px] text-amber-400">{flag.restaurantOverrides.length} restaurant override(s)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <button onClick={() => setModal(flag)} className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleToggle(flag)} disabled={togglingId === flag._id}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all disabled:opacity-40">
                        {flag.isActive ? <ToggleRight size={18} className="text-indigo-400" /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <FlagModal
          flag={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default PlatformFeatureFlags;
