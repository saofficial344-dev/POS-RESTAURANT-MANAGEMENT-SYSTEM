import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  RefreshCw, TrendingUp, DollarSign, Users, Clock,
  ArrowRight, BarChart2, TrendingDown, Star, Activity, Target, Repeat,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const fmtRs = n => `Rs ${Math.round(n || 0).toLocaleString()}`;

const STATUS_COLORS = {
  active:    { bar: 'bg-green-500',  text: 'text-green-400'  },
  trial:     { bar: 'bg-indigo-500', text: 'text-indigo-400' },
  past_due:  { bar: 'bg-amber-500',  text: 'text-amber-400'  },
  expired:   { bar: 'bg-red-500',    text: 'text-red-400'    },
  cancelled: { bar: 'bg-gray-500',   text: 'text-gray-400'   },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      <p className="text-green-400">Revenue: {fmtRs(payload[0]?.value)}</p>
      {payload[1] && <p className="text-indigo-400">Payments: {payload[1]?.value}</p>}
    </div>
  );
};

const KpiCard = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={15} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-black text-white">{value}</p>
    {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
  </div>
);

const PlatformBilling = () => {
  const navigate = useNavigate();
  const [data, setData]             = useState(null);
  const [overview, setOverview]     = useState(null);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, overviewRes] = await Promise.all([
        platformAPI.get('/dashboard/billing'),
        platformAPI.get('/invoices/overview'),
      ]);
      setData(statsRes.data.data);
      setOverview(overviewRes.data.data);
    } catch {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">Billing & Revenue</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/40 border border-gray-700/30 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-gray-800/40 border border-gray-700/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 text-gray-600">
        <BarChart2 size={32} className="mb-3 text-gray-700" />
        <p className="text-sm">No billing data available</p>
        <button onClick={load} className="mt-3 text-xs text-indigo-400 hover:underline">Retry</button>
      </div>
    );
  }

  const totalStatusCount = data.statusBreakdown?.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Billing & Revenue</h2>
          <p className="text-xs text-gray-600 mt-1">Platform-wide financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          {data.pendingPayments > 0 && (
            <button
              onClick={() => navigate('/platform/payments')}
              className="flex items-center gap-1.5 h-9 px-4 bg-amber-500/10 border border-amber-400/30 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-all"
            >
              <Clock size={13} /> {data.pendingPayments} pending
            </button>
          )}
          <button onClick={load} disabled={loading} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-4">
        <KpiCard label="MRR"                value={fmtRs(data.mrr)}               sub="Monthly Recurring"        icon={TrendingUp}  accent="bg-indigo-500" />
        <KpiCard label="ARR"                value={fmtRs(data.arr)}               sub="Annual Recurring"         icon={TrendingUp}  accent="bg-indigo-600" />
        <KpiCard label="All-Time Revenue"   value={fmtRs(data.totalRevenue)}      sub="Approved payments"        icon={DollarSign}  accent="bg-green-600"  />
        <KpiCard label="This Month"         value={fmtRs(data.thisMonthRevenue)}  sub="Current month"            icon={DollarSign}  accent="bg-green-500"  />
        <KpiCard label="This Year"          value={fmtRs(data.thisYearRevenue)}   sub="YTD revenue"              icon={DollarSign}  accent="bg-emerald-600"/>
        <KpiCard label="Active Subs"        value={data.activeSubscriptions}       sub="Paying subscribers"       icon={Users}       accent="bg-blue-600"   />
        <KpiCard label="Pending Payments"   value={data.pendingPayments}           sub="Awaiting review"          icon={Clock}       accent="bg-amber-600"  />
      </div>

      {/* Advanced metrics KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {/* Churn Rate */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Churn Rate</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-600">
              <TrendingDown size={15} className="text-white" />
            </div>
          </div>
          <p className={`text-2xl font-black ${data.churnRate > 10 ? 'text-red-400' : data.churnRate > 5 ? 'text-amber-400' : 'text-green-400'}`}>
            {data.churnRate != null ? `${data.churnRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">Cancellations this month</p>
        </div>

        {/* Trial Conversion Rate */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Trial Conversion</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-600">
              <Target size={15} className="text-white" />
            </div>
          </div>
          <p className={`text-2xl font-black ${data.trialConversionRate > 50 ? 'text-green-400' : data.trialConversionRate > 25 ? 'text-amber-400' : 'text-gray-300'}`}>
            {data.trialConversionRate != null ? `${data.trialConversionRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">Trials converted to paid</p>
        </div>

        {/* MRR Trend */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">MRR Trend</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(data.mrrTrend || 0) >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              <Activity size={15} className="text-white" />
            </div>
          </div>
          <p className={`text-2xl font-black ${(data.mrrTrend || 0) > 0 ? 'text-green-400' : (data.mrrTrend || 0) < 0 ? 'text-red-400' : 'text-gray-300'}`}>
            {data.mrrTrend != null
              ? `${data.mrrTrend > 0 ? '+' : ''}${data.mrrTrend}%`
              : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">vs last month revenue</p>
        </div>

        {/* ARPR */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">ARPR</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-600">
              <Repeat size={15} className="text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {data.arpr != null ? fmtRs(data.arpr) : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">Avg revenue per restaurant</p>
        </div>

        {/* Most Popular Plan */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Top Plan</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-600">
              <Star size={15} className="text-white" />
            </div>
          </div>
          <p className="text-2xl font-black text-white truncate">
            {data.mostPopularPlan?.planName || '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {data.mostPopularPlan ? `${data.mostPopularPlan.count} active subscribers` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-sm">Revenue Over Time</h3>
            <p className="text-xs text-gray-600 mt-0.5">Last 12 months — approved payments</p>
          </div>
        </div>

        {data.revenueChart?.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.revenueChart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
            No revenue data yet
          </div>
        )}
      </div>

      {/* Bottom row: Status breakdown + Top restaurants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Subscription status breakdown */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h3 className="font-bold text-white text-sm mb-5">Subscription Status</h3>
          {data.statusBreakdown?.length > 0 ? (
            <div className="space-y-3">
              {data.statusBreakdown.map(({ status, count }) => {
                const pct = Math.round((count / totalStatusCount) * 100);
                const col = STATUS_COLORS[status] || { bar: 'bg-gray-500', text: 'text-gray-400' };
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium capitalize ${col.text}`}>{status.replace('_',' ')}</span>
                      <span className="text-xs text-gray-500">{count} <span className="text-gray-700">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${col.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center py-8">No subscription data</p>
          )}
        </div>

        {/* Top restaurants */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-white text-sm">Top Revenue — Restaurants</h3>
            <button onClick={() => navigate('/platform/payments')} className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          {data.topRestaurants?.length > 0 ? (
            <div className="space-y-3">
              {data.topRestaurants.map((r, idx) => (
                <div key={r._id || idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-300 truncate">{r.restaurantName || '—'}</p>
                      <p className="text-[10px] text-gray-600">{r.count} payment{r.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-xs font-black text-white shrink-0 ml-3">{fmtRs(r.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center py-8">No payment data yet</p>
          )}
        </div>
      </div>

      {/* Plan distribution */}
      {data.planDistribution?.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-white text-sm mb-5">Plan Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {data.planDistribution.map((p, idx) => (
              <div key={p._id || idx} className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-white">{p.count}</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">{p.planName || '—'}</p>
                <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{p.planSlug}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice status & type breakdown */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice status counts */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-sm">Invoice Summary</h3>
              <button onClick={() => navigate('/platform/invoices')} className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total',      val: overview.totalInvoices,    cls: 'text-white'       },
                { label: 'Paid',       val: overview.paidInvoices,     cls: 'text-green-400'   },
                { label: 'Open',       val: overview.openInvoices,     cls: 'text-amber-400'   },
                { label: 'Overdue',    val: overview.overdueInvoices,  cls: 'text-red-400'     },
                { label: 'Cancelled',  val: overview.cancelledInvoices,cls: 'text-gray-500'    },
                { label: 'Refunded',   val: overview.refundedInvoices, cls: 'text-purple-400'  },
              ].map(({ label, val, cls }) => (
                <div key={label} className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-3 text-center">
                  <p className={`text-xl font-black ${cls}`}>{val ?? '—'}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {overview.refundedAmount > 0 && (
              <p className="text-xs text-purple-400 mt-3 text-center">
                Total Refunded: {fmtRs(overview.refundedAmount)}
              </p>
            )}
          </div>

          {/* Invoice by type */}
          {overview.byType?.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h3 className="font-bold text-white text-sm mb-5">Invoices by Type</h3>
              <div className="space-y-3">
                {overview.byType.map(({ type, count, total }) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-indigo-400 bg-indigo-400/10 capitalize">
                        {type?.replace(/_/g, ' ') || '—'}
                      </span>
                      <span className="text-xs text-gray-500">{count} invoice{count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{fmtRs(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlatformBilling;
