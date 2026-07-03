import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../hooks/useSocket';
import API from '../../services/api';
import {
  DollarSign, ShoppingBag, Clock, CheckCircle, XCircle,
  Truck, Users, ChefHat, UtensilsCrossed, LayoutGrid,
  AlertCircle, TrendingUp, RefreshCw, CreditCard,
  Package, UserCheck, Activity, ArrowUpRight, Building2,
  ChevronDown, Percent, Tag, Award, TrendingDown,
} from 'lucide-react';

import KPICard          from '../../components/dashboard/KPICard';
import ActivityFeed     from '../../components/dashboard/ActivityFeed';
import RevenueAreaChart from '../../components/charts/RevenueAreaChart';
import OrdersBarChart   from '../../components/charts/OrdersBarChart';
import DonutChart       from '../../components/charts/DonutChart';
import TopItemsChart    from '../../components/charts/TopItemsChart';
import EmployeeChart    from '../../components/charts/EmployeeChart';

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <section className="mb-8">
    {title && (
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.18em] mb-4">{title}</h2>
    )}
    {children}
  </section>
);

// ── Recent Bills table ────────────────────────────────────────────────────────
const RecentBillsTable = ({ bills = [], loading }) => {
  const fmt = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Recent Bills</h3>
          <p className="text-xs text-gray-400 mt-0.5">Latest transactions</p>
        </div>
        <ArrowUpRight size={16} className="text-gray-300" />
      </div>

      {bills.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No bills yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Bill','Table','Payment','By','Amount'].map((h) => (
                  <th key={h} className={`text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3 ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.slice(0, 8).map((b) => (
                <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 text-xs font-mono text-gray-500">
                    #{String(b._id).slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 text-xs font-medium text-gray-700">
                    {b.tableNo ? `T-${b.tableNo}` : '—'}
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.paymentMethod === 'Cash' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {b.paymentMethod || '—'}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{b.createdBy}</td>
                  <td className="py-3 text-right text-sm font-black text-gray-900">
                    {fmt(b.grandTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Waiter performance table ──────────────────────────────────────────────────
const WaiterPerformanceTable = ({ data = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-44 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">Top Waiters</h3>
        <p className="text-xs text-gray-400 mt-0.5">Orders served — this month</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No waiter data yet</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 5).map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-800">{w.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{w.orders} orders</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Least-selling items table ─────────────────────────────────────────────────
const LeastItemsTable = ({ data = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-50 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">Least-Selling Items</h3>
        <p className="text-xs text-gray-400 mt-0.5">Last 30 days — by quantity</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No sales data yet</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 truncate mr-3">{item.name}</span>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-red-500">{item.quantity} sold</span>
                <p className="text-[10px] text-gray-400">Rs {Math.round(item.revenue || 0).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Top Categories chart (reuses TopItemsChart style but for categories) ──────
const TopCategoriesTable = ({ data = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-44 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-50 rounded-xl" />)}</div>
      </div>
    );
  }

  const max = data.reduce((m, d) => Math.max(m, d.revenue || 0), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">Top Categories</h3>
        <p className="text-xs text-gray-400 mt-0.5">Last 30 days — by revenue</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No category data yet</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 6).map((cat, i) => {
            const pct = Math.max(Math.round((cat.revenue / max) * 100), 3);
            return (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate">{cat.name}</span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">
                    Rs {Math.round(cat.revenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Revenue detail card ───────────────────────────────────────────────────────
const RevenueDetailCard = ({ title, revenue, tax, discount, avg, count, loading }) => {
  const fmt = (n) => {
    const v = n || 0;
    if (v >= 1_000_000) return `Rs ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `Rs ${(v / 1_000).toFixed(1)}K`;
    return `Rs ${Math.round(v).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
        <div className="h-7 w-32 bg-gray-100 rounded mb-4" />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-3 bg-gray-50 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-gray-900 tracking-tight mb-4">{fmt(revenue)}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400 flex items-center gap-1"><Percent size={10} /> Tax collected</span>
          <span className="font-semibold text-gray-700">{fmt(tax)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400 flex items-center gap-1"><Tag size={10} /> Discounts given</span>
          <span className="font-semibold text-red-500">-{fmt(discount)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-gray-50 pt-2 mt-2">
          <span className="text-gray-400">Avg order value</span>
          <span className="font-semibold text-indigo-600">{fmt(avg)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Bills</span>
          <span className="font-semibold text-gray-700">{count}</span>
        </div>
      </div>
    </div>
  );
};

// ── Branch Selector ───────────────────────────────────────────────────────────
const BranchSelector = ({ branches, selectedId, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = branches.find((b) => String(b._id) === selectedId);

  if (!branches.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Building2 size={14} className="text-indigo-500" />
        {selected ? selected.name : 'All Branches'}
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${!selectedId ? 'font-semibold text-indigo-600 bg-indigo-50/50' : 'text-gray-700'}`}
            >
              All Branches
            </button>
            {branches.map((br) => (
              <button
                key={br._id}
                onClick={() => { onChange(String(br._id)); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 border-t border-gray-50 ${String(br._id) === selectedId ? 'font-semibold text-indigo-600 bg-indigo-50/50' : 'text-gray-700'}`}
              >
                <span className="block">{br.name}</span>
                {br.city && <span className="text-[10px] text-gray-400">{br.city}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null); // null = all branches
  const [branches, setBranches]   = useState([]);

  const fetchStats = useCallback(async (branchId = selectedBranch) => {
    try {
      const url = branchId
        ? `/dashboard/stats?branchId=${branchId}`
        : '/dashboard/stats';
      const { data } = await API.get(url);
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
        // Update branch list from the first response
        if (data.data.branches?.length) {
          setBranches(data.data.branches);
        }
      }
    } catch (err) {
      console.error('[AdminDashboard] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  // Initial load + 5-minute heartbeat
  useEffect(() => {
    setLoading(true);
    fetchStats(selectedBranch);
    const timer = setInterval(() => fetchStats(selectedBranch), 5 * 60_000);
    return () => clearInterval(timer);
  }, [selectedBranch]); // re-run whenever branch changes

  // ── Real-time incremental updates ─────────────────────────────────────────
  useSocketEvent('order:created', () => {
    setStats((prev) => {
      if (!prev) return prev;
      const orders = { ...(prev.orders || {}) };
      orders.active  = (orders.active  || 0) + 1;
      orders.today   = (orders.today   || 0) + 1;
      orders.pending = (orders.pending || 0) + 1;
      return { ...prev, orders };
    });
  });

  useSocketEvent('order:status:changed', ({ status }) => {
    setStats((prev) => {
      if (!prev) return prev;
      const orders = { ...(prev.orders || {}) };
      if (status === 'Completed') {
        orders.active    = Math.max(0, (orders.active    || 0) - 1);
        orders.completed = (orders.completed || 0) + 1;
      } else if (status === 'Cancelled') {
        orders.active    = Math.max(0, (orders.active    || 0) - 1);
        orders.cancelled = (orders.cancelled || 0) + 1;
      }
      return { ...prev, orders };
    });
  });

  useSocketEvent('bill:created', ({ grandTotal = 0 }) => {
    setStats((prev) => {
      if (!prev) return prev;
      const revenue = { ...(prev.revenue || {}) };
      revenue.today          = (revenue.today          || 0) + grandTotal;
      revenue.week           = (revenue.week           || 0) + grandTotal;
      revenue.month          = (revenue.month          || 0) + grandTotal;
      revenue.todayBillCount = (revenue.todayBillCount || 0) + 1;
      revenue.weekBillCount  = (revenue.weekBillCount  || 0) + 1;
      revenue.monthBillCount = (revenue.monthBillCount || 0) + 1;
      return { ...prev, revenue };
    });
  });

  // Pass fetchStats as a dep so the handler re-subscribes when branch changes,
  // avoiding a stale closure on selectedBranch.
  useSocketEvent('table:status:changed', () => {
    fetchStats(); // fetchStats useCallback captures current selectedBranch
  }, [fetchStats]);

  // ── Derived chart data ────────────────────────────────────────────────────
  const tableStatusData = stats ? [
    { name: 'Available',   value: stats.tables.available,   color: '#10B981' },
    { name: 'Occupied',    value: stats.tables.occupied,    color: '#EF4444' },
    { name: 'Reserved',    value: stats.tables.reserved,    color: '#F59E0B' },
    { name: 'Maintenance', value: stats.tables.maintenance, color: '#9CA3AF' },
  ].filter(d => d.value > 0) : [];

  const paymentData = (stats?.paymentBreakdown || []).map((p) => ({
    name:  p.name,
    value: p.count,
    color: p.color || '#6366F1',
  }));

  const menuAvailData = stats ? [
    { name: 'Available',   value: stats.menu.available,   color: '#10B981' },
    { name: 'Unavailable', value: stats.menu.unavailable, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto p-4 md:p-6">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Business Intelligence
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-PK', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              {lastUpdated && (
                <span className="ml-3 text-xs text-gray-400">
                  · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BranchSelector
              branches={branches}
              selectedId={selectedBranch}
              onChange={(id) => setSelectedBranch(id)}
            />
            <button
              onClick={() => fetchStats(selectedBranch)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ══ ROW 1: Revenue KPIs ══════════════════════════════════════════ */}
        <Section title="Revenue">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Revenue Today"
              value={stats?.revenue.today}
              subtitle={`${stats?.revenue.todayBillCount || 0} bills · avg ${
                stats?.revenue.todayAvg
                  ? `Rs ${Math.round(stats.revenue.todayAvg).toLocaleString()}`
                  : '—'
              }`}
              icon={DollarSign}
              accent="indigo"
              isCurrency
              loading={loading}
              dark
            />
            <KPICard
              title="This Week"
              value={stats?.revenue.week}
              subtitle={`${stats?.revenue.weekBillCount || 0} bills`}
              icon={TrendingUp}
              accent="blue"
              isCurrency
              loading={loading}
            />
            <KPICard
              title="This Month"
              value={stats?.revenue.month}
              subtitle={`${stats?.revenue.monthBillCount || 0} bills`}
              icon={CreditCard}
              accent="violet"
              isCurrency
              loading={loading}
            />
            <KPICard
              title="This Year"
              value={stats?.revenue.year}
              subtitle={`${stats?.revenue.yearBillCount || 0} bills`}
              icon={TrendingUp}
              accent="teal"
              isCurrency
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 2: Revenue Detail (tax / discount / avg) ═════════════════ */}
        <Section title="Revenue Breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueDetailCard
              title="Today's Detail"
              revenue={stats?.revenue.today}
              tax={stats?.revenue.todayTax}
              discount={stats?.revenue.todayDiscount}
              avg={stats?.revenue.todayAvg}
              count={stats?.revenue.todayBillCount}
              loading={loading}
            />
            <RevenueDetailCard
              title="This Month's Detail"
              revenue={stats?.revenue.month}
              tax={stats?.revenue.monthTax}
              discount={stats?.revenue.monthDiscount}
              avg={stats?.revenue.monthAvg}
              count={stats?.revenue.monthBillCount}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 3: Orders KPIs ══════════════════════════════════════════ */}
        <Section title="Orders — Today">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total"     value={stats?.orders.today}     icon={ShoppingBag}  accent="blue"    loading={loading} />
            <KPICard title="Pending"   value={stats?.orders.pending}   icon={Clock}        accent="amber"   loading={loading} />
            <KPICard title="Preparing" value={stats?.orders.cooking}   icon={ChefHat}      accent="violet"  loading={loading} />
            <KPICard title="Ready"     value={stats?.orders.ready}     icon={CheckCircle}  accent="teal"    loading={loading} />
            <KPICard title="Completed" value={stats?.orders.completed} icon={CheckCircle}  accent="emerald" loading={loading} />
            <KPICard title="Cancelled" value={stats?.orders.cancelled} icon={XCircle}      accent="red"     loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 4: Order types ══════════════════════════════════════════ */}
        <Section title="Order Types — Today">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard title="Dine-In"   value={stats?.orders.dineIn}   icon={UtensilsCrossed} accent="indigo" loading={loading} />
            <KPICard title="Walk-In"   value={stats?.orders.walkIn}   icon={Users}           accent="blue"   loading={loading} />
            <KPICard title="Delivery"  value={stats?.orders.delivery} icon={Truck}           accent="orange" loading={loading} />
            <KPICard title="Take-Away" value={stats?.orders.takeAway} icon={Package}         accent="teal"   loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 5: Staff & Operations ════════════════════════════════════ */}
        <Section title="Staff & Operations">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total Staff"  value={stats?.staff.total}    icon={Users}      accent="indigo"  loading={loading} />
            <KPICard title="Cashiers"     value={stats?.staff.cashiers} icon={CreditCard} accent="blue"    loading={loading} />
            <KPICard title="Waiters"      value={stats?.staff.waiters}  icon={UserCheck}  accent="teal"    loading={loading} />
            <KPICard title="Kitchen"      value={stats?.staff.kitchen}  icon={ChefHat}    accent="amber"   loading={loading} />
            <KPICard title="Delivery"     value={stats?.staff.delivery} icon={Truck}      accent="orange"  loading={loading} />
            <KPICard title="Inactive"     value={stats?.staff.inactive} icon={AlertCircle} accent="red"   loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 6: Tables & Menu ══════════════════════════════════════════ */}
        <Section title="Tables & Menu">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total Tables"  value={stats?.tables.total}       icon={LayoutGrid}  accent="indigo"  loading={loading} />
            <KPICard title="Occupied"      value={stats?.tables.occupied}    icon={Users}       accent="red"     loading={loading} />
            <KPICard title="Available"     value={stats?.tables.available}   icon={CheckCircle} accent="emerald" loading={loading} />
            <KPICard title="Reserved"      value={stats?.tables.reserved}    icon={Clock}       accent="amber"   loading={loading} />
            <KPICard title="Menu Items"    value={stats?.menu.totalItems}    icon={Package}     accent="blue"    loading={loading} />
            <KPICard title="Unavailable"   value={stats?.menu.unavailable}   icon={XCircle}     accent="red"     loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 7: Revenue + Orders Charts ════════════════════════════════ */}
        <Section title="Analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueAreaChart
              weeklyRevenue={stats?.weeklyRevenue || []}
              yearlyRevenue={stats?.yearlyRevenue || []}
              loading={loading}
            />
            <OrdersBarChart
              weeklyRevenue={stats?.weeklyRevenue || []}
              ordersByHour={stats?.ordersByHour   || []}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 8: Order Status + Payment + Order Types ═══════════════════ */}
        <Section title="Breakdowns">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DonutChart
              title="Order Status"
              subtitle="This month"
              data={stats?.statusBreakdown || []}
              loading={loading}
            />
            <DonutChart
              title="Payment Methods"
              subtitle="Bills this month"
              data={paymentData}
              loading={loading}
            />
            <DonutChart
              title="Order Types"
              subtitle="This month"
              data={stats?.orderTypeBreakdown || []}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 9: Top Items + Categories + Least Items ═══════════════════ */}
        <Section title="Menu Performance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopItemsChart data={stats?.topItems || []} loading={loading} />
            <TopCategoriesTable data={stats?.topCategories || []} loading={loading} />
            <LeastItemsTable data={stats?.leastItems || []} loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 10: Staff Overview + Cashier + Waiter ════════════════════ */}
        <Section title="Performance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EmployeeChart
              staffChart={stats?.staffChart             || []}
              cashierPerformance={stats?.cashierPerformance || []}
              loading={loading}
            />
            <WaiterPerformanceTable data={stats?.waiterPerformance || []} loading={loading} />
            <div className="grid grid-cols-1 gap-6">
              <DonutChart
                title="Menu Availability"
                subtitle="Items available to order"
                data={menuAvailData}
                loading={loading}
              />
            </div>
          </div>
        </Section>

        {/* ══ ROW 11: Table Status ══════════════════════════════════════════ */}
        <Section title="Operational Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart
              title="Table Status"
              subtitle="Current floor occupancy"
              data={tableStatusData}
              loading={loading}
            />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-2">Active Orders</h3>
              <p className="text-xs text-gray-400 mb-6">Orders currently in the kitchen or pending</p>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-6xl font-black text-gray-900">
                    {loading ? '—' : (stats?.orders.active ?? 0)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">active right now</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ══ ROW 12: Recent Bills + Activity Feed ══════════════════════════ */}
        <Section title="Live Feed">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentBillsTable bills={stats?.recentBills || []} loading={loading} />
            <ActivityFeed activities={stats?.activityFeed || []} loading={loading} />
          </div>
        </Section>

      </div>
    </div>
  );
};

export default AdminDashboard;
