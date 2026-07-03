import { useState, useEffect } from 'react';
import platformAPI from '../services/platformApi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

const tooltipStyle = { background: '#1F2937', border: '1px solid #374151', borderRadius: 12, color: '#F9FAFB' };
const labelStyle   = { color: '#9CA3AF', fontSize: 11 };

const ChartCard = ({ title, subtitle, children, loading }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
    {loading
      ? <div className="h-52 bg-gray-800/50 rounded-xl animate-pulse" />
      : children}
  </div>
);

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const PlatformAnalytics = () => {
  const [growth,  setGrowth]  = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [plans,   setPlans]   = useState({ plans: [], statuses: [], planStatus: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [gRes, rRes, pRes] = await Promise.all([
        platformAPI.get('/analytics/growth'),
        platformAPI.get('/analytics/revenue'),
        platformAPI.get('/analytics/plans'),
      ]);
      setGrowth(gRes.data.data  || []);
      setRevenue(rRes.data.data || []);
      setPlans(pRes.data.data   || { plans: [], statuses: [], planStatus: [] });
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmtRs = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-white">Platform Analytics</h2>
          <p className="text-xs text-gray-600 mt-1">Last 12 months across all restaurants</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Restaurant Growth */}
        <ChartCard title="Restaurant Growth" subtitle="New registrations per month" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="restGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Area type="monotone" dataKey="restaurants" name="Restaurants" stroke="#6366F1"
                strokeWidth={2.5} fill="url(#restGrad)" dot={false}
                activeDot={{ r: 4, fill: '#6366F1', stroke: '#111827', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Platform Revenue */}
        <ChartCard title="Platform Revenue" subtitle="Monthly bills across all restaurants" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v) => [fmtRs(v), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981"
                strokeWidth={2.5} fill="url(#revGrad)" dot={false}
                activeDot={{ r: 4, fill: '#10B981', stroke: '#111827', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* User + Branch Growth */}
        <ChartCard title="User & Branch Growth" subtitle="Cumulative new accounts per month" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF', paddingTop: 8 }} />
              <Bar dataKey="users"    name="Users"    fill="#6366F1" radius={[4,4,0,0]} />
              <Bar dataKey="branches" name="Branches" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Plan Distribution Pie */}
        <ChartCard title="Plan Distribution" subtitle="Active plan breakdown across restaurants" loading={loading}>
          {!plans.plans?.length ? (
            <div className="h-52 flex items-center justify-center text-gray-600 text-sm">No data</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={plans.plans} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {plans.plans.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {plans.plans.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-400">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

      </div>

      {/* Plan Status breakdown */}
      <ChartCard title="Plan Status Breakdown" subtitle="Trial vs Active vs Expired" loading={loading}>
        {!plans.planStatus?.length ? (
          <div className="h-16 flex items-center justify-center text-gray-600 text-sm">No data</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plans.planStatus.map((p, i) => (
              <div key={i} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-white">{p.value}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{p.name}</p>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

    </div>
  );
};

export default PlatformAnalytics;
