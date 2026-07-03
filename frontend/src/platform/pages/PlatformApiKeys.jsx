import { useState, useEffect } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  Plus, Key, Copy, Trash2, ToggleLeft, ToggleRight,
  Eye, EyeOff, RefreshCw, AlertTriangle, X,
} from 'lucide-react';

const SCOPE_COLORS = {
  read:     'text-green-400  bg-green-400/10',
  write:    'text-blue-400   bg-blue-400/10',
  orders:   'text-amber-400  bg-amber-400/10',
  reports:  'text-indigo-400 bg-indigo-400/10',
  webhooks: 'text-violet-400 bg-violet-400/10',
  admin:    'text-red-400    bg-red-400/10',
};

const ALL_SCOPES = ['read', 'write', 'orders', 'reports', 'webhooks', 'admin'];

const CreateModal = ({ onClose, onCreated }) => {
  const [form, setForm]     = useState({ name: '', scopes: ['read'], expiresInDays: '' });
  const [loading, setLoad]  = useState(false);
  const [rawKey, setRawKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (s) =>
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s],
    }));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Key name required'); return; }
    if (!form.scopes.length) { toast.error('Select at least one scope'); return; }
    setLoad(true);
    try {
      const payload = { name: form.name.trim(), scopes: form.scopes };
      if (form.expiresInDays) payload.expiresInDays = Number(form.expiresInDays);
      const { data } = await platformAPI.post('/api-keys', payload);
      setRawKey(data.rawKey);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create key');
    } finally { setLoad(false); }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Create API Key</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {rawKey ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                Copy this key now. It will not be shown again.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 font-mono text-xs text-green-400 break-all">
              {rawKey}
            </div>
            <button onClick={copyKey}
              className="w-full flex items-center justify-center gap-2 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all">
              <Copy size={14} />
              {copied ? 'Copied!' : 'Copy Key'}
            </button>
            <button onClick={onClose}
              className="w-full h-10 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Key Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Production Webhook"
                className="w-full h-10 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 text-sm placeholder-gray-600 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleScope(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      form.scopes.includes(s)
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Expiry (days, optional)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={form.expiresInDays}
                onChange={(e) => setForm(f => ({ ...f, expiresInDays: e.target.value }))}
                placeholder="Leave blank = never"
                className="w-full h-10 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 text-sm placeholder-gray-600 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose}
                className="flex-1 h-10 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={loading}
                className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all">
                {loading ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlatformApiKeys = () => {
  const [keys, setKeys]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setCreate] = useState(false);
  const [acting, setActing]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await platformAPI.get('/api-keys');
      setKeys(data.data || []);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id, currentActive) => {
    setActing(id);
    try {
      await platformAPI.patch(`/api-keys/${id}/toggle`);
      toast.success(currentActive ? 'Key disabled' : 'Key enabled');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  const handleRevoke = async (id, name) => {
    if (!window.confirm(`Permanently revoke "${name}"? This cannot be undone.`)) return;
    setActing(id);
    try {
      await platformAPI.delete(`/api-keys/${id}`);
      toast.success('Key revoked');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-white">API Keys</h2>
          <p className="text-xs text-gray-600 mt-1">Manage platform API access tokens</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading}
            className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
            <Plus size={16} />
            New Key
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-gray-600">
          <Key size={32} className="mb-3 text-gray-700" />
          <p className="text-sm">No API keys yet</p>
          <button onClick={() => setCreate(true)} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300">
            Create your first key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k._id}
              className={`bg-gray-800/50 border rounded-2xl p-5 transition-all ${
                k.isActive ? 'border-gray-700/50' : 'border-gray-700/30 opacity-60'
              }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <p className="font-bold text-white text-sm">{k.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      k.isActive ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-700'
                    }`}>
                      {k.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-gray-500 mb-3">{k.prefix}••••••••••••••••••••••••••••••••••••••••</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {k.scopes?.map((s) => (
                      <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SCOPE_COLORS[s] || 'text-gray-400 bg-gray-700'}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-600">
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.expiresAt && (
                      <span className={new Date(k.expiresAt) < new Date() ? 'text-red-400' : ''}>
                        Expires {new Date(k.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(k._id, k.isActive)}
                    disabled={acting === k._id}
                    title={k.isActive ? 'Disable' : 'Enable'}
                    className="p-2 rounded-xl text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all disabled:opacity-40">
                    {k.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => handleRevoke(k._id, k.name)}
                    disabled={acting === k._id}
                    title="Revoke key"
                    className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setCreate(false)}
          onCreated={() => { load(); }}
        />
      )}
    </div>
  );
};

export default PlatformApiKeys;
