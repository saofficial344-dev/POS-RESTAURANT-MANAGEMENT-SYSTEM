import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  DollarSign, ShoppingBag, Clock, CheckCircle, XCircle,
  Truck, Users, ChefHat, UtensilsCrossed, LayoutGrid,
  AlertCircle, TrendingUp, RefreshCw, CreditCard,
  Package, UserCheck, Activity, ArrowUpRight,
} from 'lucide-react';

// ── Dashboard components ──────────────────────────────────────────────────────
import KPICard        from '../../components/dashboard/KPICard';
import ActivityFeed   from '../../components/dashboard/ActivityFeed';
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

// ── Recent Bills mini-table ───────────────────────────────────────────────────
const RecentBillsTable = ({ bills = [], loading }) => {
  const fmt = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl" />)}
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
                <th className="text-left text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3">Bill</th>
                <th className="text-left text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3">Table</th>
                <th className="text-left text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3">Payment</th>
                <th className="text-left text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3">By</th>
                <th className="text-right text-[10px] text-gray-400 font-semibold uppercase tracking-widest pb-3">Amount</th>
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
                      b.paymentMethod === 'Cash'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {b.paymentMethod}
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

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await API.get('/dashboard/stats');
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 30_000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  // ── Derived chart data ──────────────────────────────────────────────────────
  const tableStatusData = stats ? [
    { name: 'Available',   value: stats.tables.available,   color: '#10B981' },
    { name: 'Occupied',    value: stats.tables.occupied,    color: '#EF4444' },
    { name: 'Reserved',    value: stats.tables.reserved,    color: '#F59E0B' },
    { name: 'Maintenance', value: stats.tables.maintenance, color: '#9CA3AF' },
  ].filter(d => d.value > 0) : [];

  const paymentData = stats?.paymentBreakdown?.map((p, i) => ({
    name:  p.name,
    value: p.count,
    color: ['#6366F1', '#3B82F6', '#10B981', '#F97316'][i % 4],
  })) || [];

  const menuAvailData = stats ? [
    { name: 'Available',   value: stats.menu.available,   color: '#10B981' },
    { name: 'Unavailable', value: stats.menu.unavailable, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  const orderTypeData = stats?.orderTypeBreakdown || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto p-4 md:p-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
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
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ══ ROW 1: Revenue KPIs ════════════════════════════════════════ */}
        <Section title="Revenue">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Revenue Today"
              value={stats?.revenue.today}
              subtitle={`${stats?.revenue.todayBillCount || 0} bills`}
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
              icon={TrendingUp}
              accent="teal"
              isCurrency
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 2: Orders KPIs ════════════════════════════════════════ */}
        <Section title="Orders — Today">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total Orders" value={stats?.orders.today}     icon={ShoppingBag}    accent="blue"    loading={loading} />
            <KPICard title="Pending"      value={stats?.orders.pending}   icon={Clock}          accent="amber"   loading={loading} />
            <KPICard title="Preparing"    value={stats?.orders.cooking}   icon={ChefHat}        accent="violet"  loading={loading} />
            <KPICard title="Ready"        value={stats?.orders.ready}     icon={CheckCircle}    accent="teal"    loading={loading} />
            <KPICard title="Completed"    value={stats?.orders.completed} icon={CheckCircle}    accent="emerald" loading={loading} />
            <KPICard title="Cancelled"    value={stats?.orders.cancelled} icon={XCircle}        accent="red"     loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 3: Staff + Tables KPIs ════════════════════════════════ */}
        <Section title="Staff & Operations">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total Staff"     value={stats?.staff.total}    icon={Users}      accent="indigo"  loading={loading} />
            <KPICard title="Cashiers"        value={stats?.staff.cashiers} icon={CreditCard} accent="blue"    loading={loading} />
            <KPICard title="Waiters"         value={stats?.staff.waiters}  icon={UserCheck}  accent="teal"    loading={loading} />
            <KPICard title="Kitchen"         value={stats?.staff.kitchen}  icon={ChefHat}    accent="amber"   loading={loading} />
            <KPICard title="Delivery Riders" value={stats?.staff.delivery} icon={Truck}      accent="orange"  loading={loading} />
            <KPICard title="Managers"        value={stats?.staff.managers} icon={AlertCircle} accent="violet" loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 4: Tables + Menu KPIs ════════════════════════════════ */}
        <Section title="Tables & Menu">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KPICard title="Total Tables"   value={stats?.tables.total}       icon={LayoutGrid} accent="indigo" loading={loading} />
            <KPICard title="Occupied"       value={stats?.tables.occupied}    icon={Users}      accent="red"    loading={loading} />
            <KPICard title="Available"      value={stats?.tables.available}   icon={CheckCircle} accent="emerald" loading={loading} />
            <KPICard title="Reserved"       value={stats?.tables.reserved}    icon={Clock}      accent="amber"  loading={loading} />
            <KPICard title="Menu Items"     value={stats?.menu.totalItems}    icon={Package}    accent="blue"   loading={loading} />
            <KPICard title="Unavailable"    value={stats?.menu.unavailable}   icon={XCircle}    accent="red"    loading={loading} />
          </div>
        </Section>

        {/* ══ ROW 5: Revenue + Orders Charts ════════════════════════════ */}
        <Section title="Analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueAreaChart
              weeklyRevenue={stats?.weeklyRevenue  || []}
              yearlyRevenue={stats?.yearlyRevenue  || []}
              loading={loading}
            />
            <OrdersBarChart
              weeklyRevenue={stats?.weeklyRevenue || []}
              ordersByHour={stats?.ordersByHour   || []}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 6: Order Status + Payment + Order Type ════════════════ */}
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
              subtitle="DineIn vs WalkIn vs Delivery"
              data={orderTypeData}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 7: Top Items + Employee ═══════════════════════════════ */}
        <Section title="Performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopItemsChart data={stats?.topItems || []} loading={loading} />
            <EmployeeChart
              staffChart={stats?.staffChart           || []}
              cashierPerformance={stats?.cashierPerformance || []}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 8: Table Status + Menu Availability ═══════════════════ */}
        <Section title="Operational Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart
              title="Table Status"
              subtitle="Current floor occupancy"
              data={tableStatusData}
              loading={loading}
            />
            <DonutChart
              title="Menu Availability"
              subtitle="Items available to order"
              data={menuAvailData}
              loading={loading}
            />
          </div>
        </Section>

        {/* ══ ROW 9: Recent Bills + Activity Feed ═══════════════════════ */}
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
