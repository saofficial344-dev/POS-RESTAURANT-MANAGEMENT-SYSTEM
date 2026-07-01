import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  MapPin, Clock, CheckCircle, Package, Navigation,
  RefreshCw, PhoneCall, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n || 0);

const STATUS_STYLE = {
  Pending:   { badge: 'bg-orange-100 text-orange-700',  label: 'Pending'     },
  Cooking:   { badge: 'bg-amber-100 text-amber-700',    label: 'Preparing'   },
  Ready:     { badge: 'bg-blue-100 text-blue-700',      label: 'Ready'       },
  Served:    { badge: 'bg-purple-100 text-purple-700',  label: 'In Transit'  },
  Completed: { badge: 'bg-emerald-100 text-emerald-700',label: 'Delivered'   },
  Cancelled: { badge: 'bg-red-100 text-red-500',        label: 'Cancelled'   },
};

// ── Delivery card ─────────────────────────────────────────────────────────────
const DeliveryCard = ({ order, userId, onAction }) => {
  const [loading, setLoading] = useState(null);
  const isAssigned = order.deliveryRiderId?._id === userId || order.deliveryRiderId === userId;
  const st = STATUS_STYLE[order.status] || STATUS_STYLE.Pending;

  const action = async (status, label) => {
    setLoading(status);
    try {
      await API.patch(`/orders/${order._id}/status`, {
        status,
        deliveryRiderId: userId,
      });
      toast.success(`Order ${label}`);
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const total = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
  const addr = order.deliveryAddress;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
            {order.isUrgent && (
              <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                URGENT
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
          {st.label}
        </span>
      </div>

      {/* Customer */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Package size={14} className="text-gray-400 shrink-0" />
          <span className="font-semibold">{order.customerName}</span>
        </div>
        {order.customerPhone && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <PhoneCall size={14} className="text-gray-400 shrink-0" />
            <span>{order.customerPhone}</span>
          </div>
        )}
        {addr?.address && (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span>{addr.address}{addr.city ? `, ${addr.city}` : ''}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-600">
            <span>{item.itemName} × {item.quantity}</span>
            <span>Rs. {fmt(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-200 mt-1">
          <span>Total</span>
          <span>Rs. {fmt(order.totalAmount || total)}</span>
        </div>
      </div>

      {/* Notes */}
      {addr?.notes && (
        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700">📝 {addr.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {/* Accept — only for Ready orders not yet assigned to this rider */}
        {order.status === 'Ready' && !isAssigned && (
          <button
            onClick={() => action('Served', 'accepted')}
            disabled={!!loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading === 'Served' ? 'Accepting…' : '🚀 Accept Delivery'}
          </button>
        )}
        {/* Out for delivery — accepted orders */}
        {order.status === 'Served' && isAssigned && (
          <button
            onClick={() => action('Completed', 'delivered')}
            disabled={!!loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading === 'Completed' ? 'Updating…' : '✅ Mark Delivered'}
          </button>
        )}
        {/* Cancel any non-terminal order */}
        {!['Completed', 'Cancelled'].includes(order.status) && (
          <button
            onClick={() => action('Cancelled', 'cancelled')}
            disabled={!!loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loading === 'Cancelled' ? '…' : 'Cancel'}
          </button>
        )}
        {/* Terminal states — no actions */}
        {order.status === 'Completed' && (
          <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-600 text-center">
            ✅ Delivered
          </div>
        )}
        {order.status === 'Cancelled' && (
          <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-400 text-center">
            Cancelled
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await API.get('/orders?orderType=Delivery');
      setOrders(data.data || []);
    } catch (err) {
      console.error('Delivery fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 20_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const activeDeliveries = orders.filter(
    (o) => !['Completed', 'Cancelled'].includes(o.status)
  );
  const history = orders.filter((o) =>
    ['Completed', 'Cancelled'].includes(o.status)
  );

  const myActive = activeDeliveries.filter(
    (o) => o.deliveryRiderId?._id === user?._id || o.deliveryRiderId === user?._id
  );
  const unassignedReady = activeDeliveries.filter(
    (o) => o.status === 'Ready' && !o.deliveryRiderId
  );

  const todayEarnings = history
    .filter((o) => o.status === 'Completed' && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (o.totalAmount || 0), 0);

  const displayedOrders =
    activeTab === 'active' ? activeDeliveries : history;

  return (
    <div className="p-6 lg:p-8 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'My Active',   value: myActive.length,          icon: Navigation,  color: 'text-blue-500'    },
          { label: 'Ready Pickup',value: unassignedReady.length,   icon: Package,     color: 'text-amber-500'   },
          { label: 'Total Active',value: activeDeliveries.length,  icon: Clock,       color: 'text-orange-500'  },
          { label: 'Today Delivered', value: history.filter(o => o.status === 'Completed' && new Date(o.createdAt).toDateString() === new Date().toDateString()).length, icon: CheckCircle, color: 'text-emerald-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today earnings callout */}
      {todayEarnings > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Today's Deliveries Value</p>
            <p className="text-xs text-emerald-600 mt-0.5">Total order value delivered today</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">Rs. {fmt(todayEarnings)}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active',  label: `🚚 Active (${activeDeliveries.length})` },
          { key: 'history', label: `📋 History (${history.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-20 text-center">
          <AlertCircle size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">
            {activeTab === 'active' ? 'No active deliveries' : 'No delivery history yet'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOrders.map((order) => (
            <DeliveryCard
              key={order._id}
              order={order}
              userId={user?._id}
              onAction={fetchOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
