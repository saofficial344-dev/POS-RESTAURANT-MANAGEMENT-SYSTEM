import { useState, useEffect, useCallback } from 'react';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  ArrowUpCircle, XCircle, RotateCcw,
} from 'lucide-react';

const STATUS_CLS = {
  trial:     'text-amber-400  bg-amber-400/10  border-amber-400/20',
  active:    'text-green-400  bg-green-400/10  border-green-400/20',
  past_due:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  cancelled: 'text-gray-500   bg-gray-700      border-transparent',
  expired:   'text-red-400    bg-red-400/10    border-red-400/20',
  suspended: 'text-red-400    bg-red-400/10    border-red-400/20',
};

// Plan badge uses the plan's color field from the database
const planBadgeStyle = (color) => ({
  color:           color || '#9CA3AF',
  backgroundColor: color ? `${color}1A` : '#374151',
});

const ChangePlanModal = ({ sub, onClose, onSaved }) => {
  const [plans, setPlans]     = useState([]);
  const [selected, setSelected] = useState('');
  const [cycle, setCycle]     = useState('monthly');
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    platformAPI.get('/plans').then(r => setPlans(r.data.data || []));
  }, []);

  const handleSave = async () => {
    if (!selected) { toast.error('Select a plan'); return; }
    setSaving(true);
    try {
      await platformAPI.patch(`/subscriptions/${sub._id}/change-plan`, {
        planSlug: selected, billingCycle: cycle, reason,
      });
      toast.success('Plan changed');
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-4">Change Plan</h3>
        <p className="text-xs text-gray-500 mb-4">
          Restaurant: <span className="text-gray-300">{sub.restaurantId?.name}</span>
        </p>
        <div className="space-y-3">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="w-full h-10 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 text-sm outline-none focus:border-indigo-500">
            <option value="">Select plan…</option>
            {plans.map(p => <option key={p.slug} value={p.slug}>{p.displayName}</option>)}
          </select>
          <select value={cycle} onChange={e => setCycle(e.target.value)}
            className="w-full h-10 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 text-sm outline-none focus:border-indigo-500">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}
            className="w-full h-10 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 text-sm outline-none focus:border-indigo-500" />
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-700 text-gray-400 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
              {saving ? 'Saving…' : 'Change Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlatformSubscriptions = () => {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pagination, setPag]    = useState({ total: 0, pages: 1 });
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('');
  const [actingId, setActingId] = useState(null);
  const [changeModal, setChangeModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 20 });
      if (search.trim())  p.set('search', search.trim());
      if (statusFilter)   p.set('status', statusFilter);
      const { data: res } = await platformAPI.get(`/subscriptions?${p}`);
      setData(res.data || []);
      setPag(res.pagination || { total: 0, pages: 1 });
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, endpoint, successMsg) => {
    setActingId(id);
    try {
      await platformAPI.patch(`/subscriptions/${id}/${endpoint}`, {});
      toast.success(successMsg);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActingId(null); }
  };

  const inputCls = 'h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Subscriptions</h2>
          <p className="text-xs text-gray-600 mt-1">{pagination.total} total</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search restaurant…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`${inputCls} pl-8 w-full`} />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Status</option>
          {['trial','active','past_due','cancelled','expired','suspended'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatus(''); setPage(1); }} className="h-9 px-3 text-sm text-gray-600 hover:text-gray-300">Clear</button>
        )}
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No subscriptions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Restaurant','Plan','Status','Billing','Period End','Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {data.map(sub => (
                  <tr key={sub._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{sub.restaurantId?.name || '—'}</p>
                      <p className="text-[11px] text-gray-600 font-mono">{sub.restaurantId?.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={planBadgeStyle(sub.planId?.color)}>
                        {sub.planId?.name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[sub.status] || 'text-gray-400 bg-gray-700 border-transparent'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 capitalize">{sub.billingCycle}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setChangeModal(sub)} title="Change Plan"
                          className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all">
                          <ArrowUpCircle size={14} />
                        </button>
                        {!['cancelled','expired'].includes(sub.status) && (
                          <button onClick={() => act(sub._id, 'cancel', 'Cancelled')} disabled={actingId === sub._id}
                            title="Cancel" className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40">
                            <XCircle size={14} />
                          </button>
                        )}
                        {['cancelled','expired'].includes(sub.status) && (
                          <button onClick={() => act(sub._id, 'reactivate', 'Reactivated')} disabled={actingId === sub._id}
                            title="Reactivate" className="p-1.5 rounded-lg text-gray-600 hover:text-green-400 hover:bg-green-400/10 transition-all disabled:opacity-40">
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page===pagination.pages}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}

      {changeModal && (
        <ChangePlanModal sub={changeModal} onClose={() => setChangeModal(null)} onSaved={load} />
      )}
    </div>
  );
};

export default PlatformSubscriptions;
