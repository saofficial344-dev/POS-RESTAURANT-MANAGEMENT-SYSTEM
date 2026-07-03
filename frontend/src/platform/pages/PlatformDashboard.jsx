import { useState, useEffect, useCallback } from 'react';
import platformAPI from '../services/platformApi';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { connectSocket, disconnectSocket } from '../../socket/socketClient';
import {
  Building2, GitBranch, Users, ShoppingBag,
  DollarSign, TrendingUp, UserPlus, RefreshCw,
  Clock, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};
const fmtRs = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI = ({ title, value, sub, icon: Icon, accent = 'indigo', loading }) => {
  const accents = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green:  'text-green-400  bg-green-500/10',
    amber:  'text-amber-400  bg-amber-500/10',
    red:    'text-red-400    bg-red-500/10',
    blue:   'text-blue-400   bg-blue-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  };
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-700 rounded" />
          <div className="h-7 w-16 bg-gray-700 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accents[accent]}`}>
              <Icon size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
};

// ── Recent Restaurants Mini-table ─────────────────────────────────────────────
const STATUS_COLORS = {
  active:     'text-green-400  bg-green-400/10',
  suspended:  'text-red-400    bg-red-400/10',
  onboarding: 'text-amber-400  bg-amber-400/10',
};
const PLAN_COLORS = {
  Basic:   'text-gray-400  bg-gray-400/10',
  Advance: 'text-blue-400  bg-blue-400/10',
  Premium: 'text-indigo-400 bg-indigo-400/10',
};

const RecentTable = ({ rows }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
    <h3 className="text-sm font-bold text-white mb-4">Recent Registrations</h3>
    {!rows?.length ? (
      <p className="text-sm text-gray-600 text-center py-6">No restaurants yet</p>
    ) : (
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r._id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-700/40 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{r.name}</p>
              <p className="text-[10px] text-gray-600 font-mono">{r.slug}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[r.plan] || 'text-gray-400 bg-gray-400/10'}`}>
                {r.plan}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'text-gray-400 bg-gray-400/10'}`}>
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const PlatformDashboard = () => {
  const { platformAdmin } = usePlatformAuth();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await platformAPI.get('/dashboard/stats');
      if (data.success) { setStats(data.data); setUpdated(new Date()); }
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Real-time platform metrics via Socket.IO (separate connection using platform token)
  useEffect(() => {
    const token = platformAdmin?.token;
    if (!token) return;

    const socket = connectSocket(token);

    const handler = (data) => {
      setLiveMetrics(data);
      setUpdated(new Date());
    };
    socket.on('platform:metrics:update', handler);

    return () => {
      socket.off('platform:metrics:update', handler);
    };
  }, [platformAdmin?.token]);

  const d = stats;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-white">Platform Overview</h2>
          <p className="text-xs text-gray-600 mt-1">
            {updated
              ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Loading…'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI title="Total Restaurants" value={fmt(d?.restaurants.total)}
          sub={`${d?.restaurants.active || 0} active`} icon={Building2} accent="indigo" loading={loading} />
        <KPI title="Total Branches" value={fmt(d?.branchCount)}
          icon={GitBranch} accent="blue" loading={loading} />
        <KPI title="Active Users" value={fmt(d?.userCount)}
          icon={Users} accent="green" loading={loading} />
        <KPI title="Total Orders" value={fmt(d?.orders.total)}
          sub={`${d?.orders.today || 0} today`} icon={ShoppingBag} accent="amber" loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI title="Platform Revenue" value={fmtRs(d?.revenue.total)}
          sub={`${fmtRs(d?.revenue.today)} today`} icon={DollarSign} accent="green" loading={loading} />
        <KPI title="New (30d)" value={fmt(d?.newRestaurantsLast30)}
          icon={UserPlus} accent="indigo" loading={loading} />
        <KPI title="Suspended" value={fmt(d?.restaurants.suspended)}
          icon={XCircle} accent="red" loading={loading} />
        <KPI title="Onboarding" value={fmt(d?.restaurants.onboarding)}
          icon={Clock} accent="amber" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Monthly growth chart */}
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Monthly Registrations</h3>
          {!d?.monthlyGrowth?.length ? (
            <div className="h-52 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d.monthlyGrowth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="platformGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 12, color: '#F9FAFB' }}
                  labelStyle={{ color: '#9CA3AF', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="registrations" stroke="#6366F1" strokeWidth={2.5}
                  fill="url(#platformGrad)" dot={false}
                  activeDot={{ r: 4, fill: '#6366F1', stroke: '#111827', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan distribution */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Plan Distribution</h3>
          {!d?.planBreakdown?.length ? (
            <div className="h-52 flex items-center justify-center text-gray-600 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={d.planBreakdown} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="plan" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 12, color: '#F9FAFB' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {d.planBreakdown.map((_, i) => (
                      <Cell key={i} fill={['#6366F1', '#3B82F6', '#10B981'][i % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {d.planBreakdown.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{p.plan}</span>
                    <span className="text-xs font-bold text-white">{p.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Restaurants */}
      <RecentTable rows={d?.recentRestaurants} />

    </div>
  );
};

export default PlatformDashboard;
