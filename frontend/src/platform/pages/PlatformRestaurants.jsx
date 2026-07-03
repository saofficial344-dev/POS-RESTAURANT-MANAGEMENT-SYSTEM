import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  Search, ChevronLeft, ChevronRight, ExternalLink,
  PauseCircle, PlayCircle, Building2, RefreshCw, Plus, Trash2,
} from 'lucide-react';

const STATUS_BADGE = {
  active:     'text-green-400  bg-green-400/10  border-green-400/20',
  suspended:  'text-red-400    bg-red-400/10    border-red-400/20',
  onboarding: 'text-amber-400  bg-amber-400/10  border-amber-400/20',
};
const PLAN_BADGE = {
  Basic:   'text-gray-400   bg-gray-700',
  Advance: 'text-blue-400   bg-blue-400/10',
  Premium: 'text-indigo-400 bg-indigo-400/10',
};
const PLAN_STATUS_BADGE = {
  active:    'text-green-400  bg-green-400/10',
  trial:     'text-amber-400  bg-amber-400/10',
  expired:   'text-red-400    bg-red-400/10',
  cancelled: 'text-gray-500   bg-gray-700',
};

const Badge = ({ label, cls }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
    {label}
  </span>
);

const PlatformRestaurants = () => {
  const navigate      = useNavigate();
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filters, setFilters]   = useState({ status: '', plan: '', planStatus: '' });
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 15 });
      if (search.trim())        p.set('search',     search.trim());
      if (filters.status)       p.set('status',     filters.status);
      if (filters.plan)         p.set('plan',        filters.plan);
      if (filters.planStatus)   p.set('planStatus',  filters.planStatus);

      const { data: res } = await platformAPI.get(`/restaurants?${p}`);
      setData(res.data);
      setPagination(res.pagination);
    } catch { toast.error('Failed to load restaurants'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);

  const handleSuspend = async (id, name) => {
    if (!window.confirm(`Suspend "${name}"? All logins will be blocked.`)) return;
    setActingId(id);
    try {
      await platformAPI.patch(`/restaurants/${id}/suspend`, { reason: 'Suspended by platform admin' });
      toast.success(`${name} suspended`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActingId(null); }
  };

  const handleActivate = async (id, name) => {
    setActingId(id);
    try {
      await platformAPI.patch(`/restaurants/${id}/activate`);
      toast.success(`${name} activated`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActingId(null); }
  };

  const inputCls = 'h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500 transition-all';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Restaurants</h2>
          <p className="text-xs text-gray-600 mt-1">{pagination.total} total across platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/platform/restaurants/deleted')}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-500 hover:text-red-400 transition-colors"
            title="View deleted restaurants archive">
            <Trash2 size={14} />
            Deleted
          </button>
          <button onClick={() => navigate('/platform/restaurants/create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus size={14} />
            Create Restaurant
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputCls} pl-8 w-full`} />
        </div>
        <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }} className={inputCls}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="onboarding">Onboarding</option>
        </select>
        <select value={filters.plan} onChange={(e) => { setFilters(f => ({ ...f, plan: e.target.value })); setPage(1); }} className={inputCls}>
          <option value="">All Plans</option>
          <option value="Basic">Basic</option>
          <option value="Advance">Advance</option>
          <option value="Premium">Premium</option>
        </select>
        <select value={filters.planStatus} onChange={(e) => { setFilters(f => ({ ...f, planStatus: e.target.value })); setPage(1); }} className={inputCls}>
          <option value="">All Plan Status</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || filters.status || filters.plan || filters.planStatus) && (
          <button onClick={() => { setSearch(''); setFilters({ status: '', plan: '', planStatus: '' }); setPage(1); }}
            className="h-9 px-3 text-sm text-gray-600 hover:text-gray-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <Building2 size={32} className="mb-3 text-gray-700" />
            <p className="text-sm">No restaurants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Restaurant', 'Slug', 'Plan', 'Plan Status', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {data.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{r.name}</p>
                      <p className="text-[11px] text-gray-600">{r.email || '—'}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{r.slug}</td>
                    <td className="px-5 py-4">
                      <Badge label={r.plan} cls={`border-transparent ${PLAN_BADGE[r.plan] || 'text-gray-400 bg-gray-700'}`} />
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={r.planStatus} cls={`border-transparent ${PLAN_STATUS_BADGE[r.planStatus] || 'text-gray-400 bg-gray-700'}`} />
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={r.status} cls={STATUS_BADGE[r.status] || 'text-gray-400 bg-gray-700 border-transparent'} />
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/platform/restaurants/${r._id}`)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                          title="View details">
                          <ExternalLink size={14} />
                        </button>
                        {r.status !== 'suspended' ? (
                          <button onClick={() => handleSuspend(r._id, r.name)}
                            disabled={actingId === r._id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
                            title="Suspend">
                            <PauseCircle size={14} />
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(r._id, r.name)}
                            disabled={actingId === r._id}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-green-400 hover:bg-green-400/10 transition-all disabled:opacity-40"
                            title="Activate">
                            <PlayCircle size={14} />
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlatformRestaurants;
