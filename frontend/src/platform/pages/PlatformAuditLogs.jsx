import { useState, useEffect, useCallback } from 'react';
import platformAPI from '../services/platformApi';
import { Search, ChevronLeft, ChevronRight, RefreshCw, FileText } from 'lucide-react';

const ACTION_COLORS = {
  PLATFORM_LOGIN:          'text-green-400  bg-green-400/10',
  PLATFORM_LOGOUT:         'text-gray-400   bg-gray-700',
  PLATFORM_LOGIN_FAILED:   'text-red-400    bg-red-400/10',
  RESTAURANT_SUSPENDED:    'text-red-400    bg-red-400/10',
  RESTAURANT_ACTIVATED:    'text-green-400  bg-green-400/10',
  RESTAURANT_PLAN_CHANGED: 'text-amber-400  bg-amber-400/10',
  RESTAURANT_VIEWED:       'text-indigo-400 bg-indigo-400/10',
  API_KEY_CREATED:         'text-blue-400   bg-blue-400/10',
  API_KEY_REVOKED:         'text-red-400    bg-red-400/10',
  API_KEY_TOGGLED:         'text-amber-400  bg-amber-400/10',
};

const ACTION_OPTIONS = [
  'PLATFORM_LOGIN', 'PLATFORM_LOGOUT', 'PLATFORM_LOGIN_FAILED',
  'RESTAURANT_SUSPENDED', 'RESTAURANT_ACTIVATED', 'RESTAURANT_PLAN_CHANGED',
  'RESTAURANT_VIEWED', 'API_KEY_CREATED', 'API_KEY_REVOKED', 'API_KEY_TOGGLED',
];

const TARGET_OPTIONS = ['Restaurant', 'PlatformAdmin', 'ApiKey', 'SupportTicket'];

const relTime = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const PlatformAuditLogs = () => {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pagination, setPag]    = useState({ total: 0, pages: 1 });
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState({ action: '', targetType: '', actorEmail: '' });
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 25 });
      if (filters.action)      p.set('action',     filters.action);
      if (filters.targetType)  p.set('targetType', filters.targetType);
      if (search.trim())       p.set('actorEmail', search.trim());

      const { data: res } = await platformAPI.get(`/audit-logs?${p}`);
      setLogs(res.data || []);
      setPag(res.pagination || { total: 0, pages: 1 });
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [page, filters, search]);

  useEffect(() => { load(); }, [load]);

  const inputCls = 'h-9 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 text-sm outline-none focus:border-indigo-500 transition-all';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Audit Logs</h2>
          <p className="text-xs text-gray-600 mt-1">{pagination.total} events recorded</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Filter by actor email…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputCls} pl-8 w-full`} />
        </div>
        <select value={filters.action} onChange={(e) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }} className={inputCls}>
          <option value="">All Actions</option>
          {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.targetType} onChange={(e) => { setFilters(f => ({ ...f, targetType: e.target.value })); setPage(1); }} className={inputCls}>
          <option value="">All Targets</option>
          {TARGET_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filters.action || filters.targetType) && (
          <button onClick={() => { setSearch(''); setFilters({ action: '', targetType: '', actorEmail: '' }); setPage(1); }}
            className="h-9 px-3 text-sm text-gray-600 hover:text-gray-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <FileText size={32} className="mb-3 text-gray-700" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {logs.map((log) => {
              const actionCls = ACTION_COLORS[log.action] || 'text-gray-400 bg-gray-700';
              const isExpanded = expanded === log._id;
              return (
                <div key={log._id}>
                  <button
                    className="w-full text-left px-5 py-3.5 hover:bg-gray-700/20 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : log._id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${actionCls}`}>
                        {log.action}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {log.actorName || log.actorEmail}
                          {log.targetName && (
                            <span className="text-gray-500 font-normal"> → {log.targetName}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-600 font-mono">{log.actorEmail}</p>
                      </div>
                      {log.targetType && (
                        <span className="text-[10px] text-gray-600 bg-gray-700/50 px-2 py-0.5 rounded shrink-0">
                          {log.targetType}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-600 shrink-0 tabular-nums">
                        {relTime(log.createdAt)}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-900/50 border-t border-gray-700/30">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-xs">
                        <div>
                          <p className="text-gray-600 mb-0.5">IP</p>
                          <p className="text-gray-300 font-mono">{log.ip || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">Target ID</p>
                          <p className="text-gray-300 font-mono truncate">{log.targetId || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">Timestamp</p>
                          <p className="text-gray-300">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="col-span-full">
                            <p className="text-gray-600 mb-0.5">Metadata</p>
                            <pre className="text-gray-400 text-[10px] bg-gray-800 rounded-lg p-3 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

export default PlatformAuditLogs;
