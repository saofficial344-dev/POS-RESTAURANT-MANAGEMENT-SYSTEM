import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, useSocket } from '../../hooks/useSocket';
import API from '../../services/api';

// ── Kitchen timer (minutes since order created) ───────────────────────────────
const useTimer = (createdAt) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
      setElapsed(diff);
    };
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, [createdAt]);

  return elapsed;
};

const ElapsedBadge = ({ createdAt }) => {
  const mins = useTimer(createdAt);
  const urgent = mins >= 15;
  const warn = mins >= 8;
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-100 text-red-600' : warn ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
    >
      {mins}m
    </span>
  );
};

// ── Order card ────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusChange, updating }) => {
  const isUpdating = updating === order._id;

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
        order.isUrgent ? 'border-red-400' : 'border-transparent'
      } ${isUpdating ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              #{order.orderNumber}
            </span>
            {order.isUrgent && (
              <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                URGENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{order.orderType}</span>
            {order.tableNumber && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                T-{order.tableNumber}
              </span>
            )}
          </div>
        </div>
        <ElapsedBadge createdAt={order.createdAt} />
      </div>

      <div className="space-y-1.5 mb-3">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">{item.itemName}</span>
            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-700">📝 {order.notes}</p>
        </div>
      )}

      {order.status === 'Pending' && (
        <button
          onClick={() => onStatusChange(order._id, 'Cooking')}
          disabled={isUpdating}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {isUpdating ? 'Updating…' : '🍳 Start Cooking'}
        </button>
      )}
      {order.status === 'Cooking' && (
        <button
          onClick={() => onStatusChange(order._id, 'Ready')}
          disabled={isUpdating}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {isUpdating ? 'Updating…' : '✅ Mark Ready'}
        </button>
      )}
      {order.status === 'Ready' && (
        <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/80 text-emerald-700 text-center border border-emerald-200">
          🔔 Waiter notified — awaiting pickup
        </div>
      )}
    </div>
  );
};

// ── Column ────────────────────────────────────────────────────────────────────
const Column = ({ title, emoji, orders, color, onStatusChange, updating }) => (
  <div className={`rounded-2xl overflow-hidden flex flex-col ${color}`}>
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white text-lg">
          {emoji} {title}
        </h2>
        <span className="text-white/70 text-sm font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>
    </div>
    <div className="flex-1 p-3 space-y-3 overflow-y-auto">
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm font-medium">No orders</p>
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onStatusChange={onStatusChange}
            updating={updating}
          />
        ))
      )}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const KitchenDisplay = () => {
  const navigate    = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [orders,      setOrders]      = useState({ pending: [], cooking: [], ready: [] });
  const [loading,     setLoading]     = useState(true);
  const [updating,    setUpdating]    = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error,       setError]       = useState(null);
  const fetchDebounce = useRef(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const { data } = await API.get('/orders/kitchen');
      if (data.success) {
        setOrders(data.data);
        setLastRefresh(new Date());
      }
    } catch (err) {
      setError('Unable to fetch orders. Retrying…');
      console.error('Kitchen fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced re-fetch — prevents hammering the API on rapid socket events
  const debouncedFetch = useCallback(() => {
    if (fetchDebounce.current) clearTimeout(fetchDebounce.current);
    fetchDebounce.current = setTimeout(fetchOrders, 300);
  }, [fetchOrders]);

  useEffect(() => {
    if (user && !['kitchen', 'admin', 'manager'].includes(user.role)) {
      navigate('/', { replace: true });
      return;
    }
    fetchOrders();
  }, [fetchOrders, user, navigate]);

  // Real-time: new order → re-fetch so kitchen sees it immediately
  useSocketEvent('order:created', () => debouncedFetch());

  // Kitchen-specific: when waiter serves an order, remove from Ready column
  useSocketEvent('order:served',  ({ orderId }) => {
    setOrders((prev) => ({
      pending: prev.pending.filter((o) => o._id !== orderId),
      cooking: prev.cooking.filter((o) => o._id !== orderId),
      ready:   prev.ready.filter((o)   => o._id !== orderId),
    }));
    setLastRefresh(new Date());
  });

  // Real-time: order status changed → update local state without full re-fetch
  useSocketEvent('order:status:changed', ({ orderId, status }) => {
    const REMOVE_STATUSES = ['Served', 'Completed', 'Cancelled'];

    setOrders((prev) => {
      // Find the order in any column
      const allOrders = [...prev.pending, ...prev.cooking, ...prev.ready];
      const order = allOrders.find((o) => o._id === orderId);

      if (!order) {
        // Unknown order — re-fetch to get fresh state
        debouncedFetch();
        return prev;
      }

      if (REMOVE_STATUSES.includes(status)) {
        return {
          pending: prev.pending.filter((o) => o._id !== orderId),
          cooking: prev.cooking.filter((o) => o._id !== orderId),
          ready:   prev.ready.filter((o)   => o._id !== orderId),
        };
      }

      const updated = { ...order, status };

      return {
        pending: status === 'Pending'
          ? [...prev.pending.filter((o) => o._id !== orderId), updated].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          : prev.pending.filter((o) => o._id !== orderId),
        cooking: status === 'Cooking'
          ? [...prev.cooking.filter((o) => o._id !== orderId), updated].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          : prev.cooking.filter((o) => o._id !== orderId),
        ready: status === 'Ready'
          ? [...prev.ready.filter((o) => o._id !== orderId), updated].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          : prev.ready.filter((o) => o._id !== orderId),
      };
    });

    setLastRefresh(new Date());
  });

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus });
      // Socket event will update the UI — no need to re-fetch
    } catch (err) {
      console.error('Status update error:', err);
      fetchOrders(); // fallback: re-fetch if socket missed it
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const totalActive = orders.pending.length + orders.cooking.length + orders.ready.length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-black border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-white font-bold text-xl">Kitchen Display</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Connecting…'}
              {error && <span className="text-red-400 ml-2">{error}</span>}
            </p>
          </div>
          {/* Socket connection indicator */}
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
            title={connected ? 'Live' : 'Reconnecting…'}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white text-sm font-semibold">{totalActive} active</p>
            <p className="text-gray-500 text-xs">
              {connected ? '🟢 Live' : '🔴 Offline'}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading orders…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 p-4 min-h-0">
          <Column
            title="Pending"
            emoji="🔔"
            orders={orders.pending}
            color="bg-orange-600"
            onStatusChange={handleStatusChange}
            updating={updating}
          />
          <Column
            title="Cooking"
            emoji="🍲"
            orders={orders.cooking}
            color="bg-amber-600"
            onStatusChange={handleStatusChange}
            updating={updating}
          />
          <Column
            title="Ready"
            emoji="✅"
            orders={orders.ready}
            color="bg-emerald-700"
            onStatusChange={handleStatusChange}
            updating={updating}
          />
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
