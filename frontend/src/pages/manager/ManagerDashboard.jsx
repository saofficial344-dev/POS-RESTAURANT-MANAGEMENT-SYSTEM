import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  TrendingUp, ShoppingBag, DollarSign,
  RefreshCw, Clock, LayoutGrid,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n || 0);

const pct = (v, t) => (t > 0 ? Math.round((v / t) * 100) : 0);

const ROLE_COLORS = {
  admin:    'bg-indigo-100 text-indigo-700',
  cashier:  'bg-emerald-100 text-emerald-700',
  kitchen:  'bg-amber-100  text-amber-700',
  waiter:   'bg-blue-100   text-blue-700',
  delivery: 'bg-orange-100 text-orange-700',
  manager:  'bg-violet-100 text-violet-700',
};

// ── Simple bar chart ──────────────────────────────────────────────────────────
const RevenueBar = ({ data }) => {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <p className="text-[9px] text-gray-400">{d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ''}</p>
          <div
            className="w-full bg-black rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max(pct(d.revenue, max), 3)}%` }}
          />
          <p className="text-[9px] text-gray-500">{d.day}</p>
        </div>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/users'),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      setStaffList(usersRes.data || []);
    } catch (err) {
      console.error('Manager dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const s = stats || {};
  const revenue = s.revenue || {};
  const orders = s.orders || {};
  const tables = s.tables || {};
  const staff = s.staff || {};
  const weekly = s.weeklyRevenue || [];
  const topItems = s.topItems || [];

  const activeStaff = staffList.filter((u) => u.status === 'active');

  const Skeleton = () => <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="p-6 lg:p-8 min-h-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `Rs. ${fmt(revenue.today)}`, sub: `${revenue.todayBillCount || 0} bills`, icon: DollarSign, color: 'text-emerald-500' },
          { label: 'This Week',       value: `Rs. ${fmt(revenue.week)}`,  sub: `${revenue.weekBillCount || 0} bills`,  icon: TrendingUp,  color: 'text-blue-500'    },
          { label: 'Orders Today',    value: orders.today || 0,           sub: `${orders.completed || 0} completed`,  icon: ShoppingBag, color: 'text-violet-500'  },
          { label: 'Active Orders',   value: orders.active || 0,          sub: 'Right now in kitchen',                icon: Clock,       color: 'text-amber-500'   },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className={`mb-3 ${card.color}`}><card.icon size={20} /></div>
            {loading ? <Skeleton /> : <p className="text-2xl font-bold text-gray-900">{card.value}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly revenue */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Revenue — Last 7 Days</h2>
              <p className="text-xs text-gray-400 mt-0.5">Daily completed bills</p>
            </div>
            {weekly.length > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">Rs. {fmt(revenue.week)}</p>
                <p className="text-xs text-gray-400">this week</p>
              </div>
            )}
          </div>
          {loading ? (
            <div className="h-28 bg-gray-100 rounded animate-pulse" />
          ) : weekly.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <RevenueBar data={weekly} />
          )}
        </div>

        {/* Order status breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-5">Today's Order Breakdown</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Pending',   value: orders.pending,   bar: 'bg-orange-400', total: orders.today },
                { label: 'Cooking',   value: orders.cooking,   bar: 'bg-amber-400',  total: orders.today },
                { label: 'Completed', value: orders.completed, bar: 'bg-emerald-500',total: orders.today },
                { label: 'Cancelled', value: orders.cancelled, bar: 'bg-red-400',    total: orders.today },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">{row.label}</span>
                    <span className="text-xs text-gray-400">{row.value || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.bar} rounded-full`} style={{ width: `${pct(row.value || 0, row.total || 1)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 flex justify-between text-xs font-bold">
                <span className="text-gray-500">Total</span>
                <span className="text-gray-900">{orders.today || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Staff + Tables + Top Items */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Top selling items */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-5">Top Selling Items</h2>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : topItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No sales data yet</p>
          ) : (
            <div className="space-y-4">
              {topItems.slice(0, 5).map((item, i) => {
                const max = topItems[0]?.quantity || 1;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">{item.quantity} sold</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${pct(item.quantity, max)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table occupancy */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-800">Table Status</h2>
            {tables.total > 0 && (
              <span className="text-xs text-gray-400">{tables.occupancyRate}% occupied</span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : tables.total === 0 ? (
            <div className="py-8 text-center">
              <LayoutGrid size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No tables configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Available',   count: tables.available,   bar: 'bg-emerald-400' },
                { label: 'Occupied',    count: tables.occupied,    bar: 'bg-red-400'     },
                { label: 'Reserved',    count: tables.reserved,    bar: 'bg-amber-400'   },
                { label: 'Maintenance', count: tables.maintenance, bar: 'bg-gray-300'    },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">{row.label}</span>
                    <span className="text-xs text-gray-400">{row.count} / {tables.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.bar} rounded-full`} style={{ width: `${pct(row.count, tables.total)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active staff */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Active Staff</h2>
            <p className="text-xs text-gray-400 mt-0.5">{activeStaff.length} accounts active</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : activeStaff.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No active staff</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {activeStaff.slice(0, 10).map((member) => (
                <div key={member._id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-gray-800">{member.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-500'}`}>
                    {member.role}
                  </span>
                </div>
              ))}
              {activeStaff.length > 10 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center">
                  +{activeStaff.length - 10} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'View Bills',    path: '/admin/bills',    emoji: '🧾' },
            { label: 'Menu Items',    path: '/admin/menu',     emoji: '🍽️' },
            { label: 'Manage Users',  path: '/admin/users',    emoji: '👥' },
            { label: 'Refresh Data',  action: fetchData,       emoji: '↺'  },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.path ? () => navigate(action.path) : action.action}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all hover:-translate-y-0.5"
            >
              <div className="text-2xl mb-2">{action.emoji}</div>
              <p className="text-sm font-semibold text-gray-800">{action.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
