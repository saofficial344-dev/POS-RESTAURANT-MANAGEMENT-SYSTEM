import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import platformAPI from '../services/platformApi';
import { ArrowLeft, Trash2, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';

const PlatformDeletedRestaurants = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 20, status: 'deleted' });
      if (search.trim()) p.set('search', search.trim());
      const { data: res } = await platformAPI.get(`/restaurants?${p}`);
      setData(res.data);
      setPagination(res.pagination);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/platform/restaurants')}
            className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Deleted Restaurants</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 uppercase tracking-wider">
                Archive
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {pagination.total} permanently deleted restaurant{pagination.total !== 1 ? 's' : ''} — all related data has been removed
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Notice banner */}
      <div className="mb-5 flex items-start gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
        <Trash2 size={16} className="text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-red-300 leading-relaxed">
          These restaurants have been permanently deleted. All subscriptions, invoices, payments, orders, users, and other data have been removed.
          Only the restaurant record is retained as a tombstone for audit purposes.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input type="text" placeholder="Search deleted…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg pl-8 pr-3 text-sm outline-none focus:border-red-500 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <Trash2 size={28} className="mb-3 text-gray-700" />
            <p className="text-sm">{search ? 'No deleted restaurants match your search' : 'No deleted restaurants'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {['Restaurant', 'Slug', 'Plan (at deletion)', 'Created', 'Deleted'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {data.map((r) => (
                  <tr key={r._id} className="opacity-75">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-400">{r.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                          deleted
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">{r.email || '—'}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">{r.slug}</td>
                    <td className="px-5 py-4 text-xs text-gray-600">{r.plan || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-red-400/70 whitespace-nowrap">
                      {r.deletedAt ? new Date(r.deletedAt).toLocaleDateString() : '—'}
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

export default PlatformDeletedRestaurants;
