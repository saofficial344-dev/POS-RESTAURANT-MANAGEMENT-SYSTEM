import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import {
  Users, Clock, CheckCircle, AlertCircle,
  RefreshCw, ChefHat, X, LayoutGrid, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

import SearchBar      from '../../components/pos/SearchBar';
import CategoryFilter from '../../components/pos/CategoryFilter';
import MenuGrid       from '../../components/pos/MenuGrid';
import CartPanel      from '../../components/pos/CartPanel';

// ── Constants ─────────────────────────────────────────────────────────────────
const TABLE_STATUS_STYLE = {
  Available:   { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  Occupied:    { bg: 'bg-red-50    border-red-200',      badge: 'bg-red-100    text-red-700',       dot: 'bg-red-400'     },
  Reserved:    { bg: 'bg-amber-50  border-amber-200',    badge: 'bg-amber-100  text-amber-700',     dot: 'bg-amber-400'   },
  Maintenance: { bg: 'bg-gray-50   border-gray-200',     badge: 'bg-gray-100   text-gray-400',      dot: 'bg-gray-300'    },
};

const ORDER_STATUS_BADGE = {
  Pending: 'bg-orange-100 text-orange-700',
  Cooking: 'bg-amber-100  text-amber-700',
  Ready:   'bg-emerald-100 text-emerald-700',
  Served:  'bg-blue-100   text-blue-700',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n || 0);

// ── Order View Modal (occupied table) ─────────────────────────────────────────
const OrderViewModal = ({ table, order, onClose, onCancelled }) => {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await API.post(`/orders/${order._id}/cancel`, { reason: 'Cancelled by waiter' });
      toast.success('Order cancelled');
      onCancelled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const total = order?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              Table {table.tableNumber} — Current Order
            </h2>
            {order && <p className="text-xs text-gray-400 mt-0.5">#{order.orderNumber}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!order ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No active order found for this table
            </p>
          ) : (
            <>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ORDER_STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-500'}`}>
                {order.status}
              </span>

              <div className="space-y-2 mt-3">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">
                      {item.itemName} × {item.quantity}
                      {item.specialInstructions && (
                        <span className="block text-xs text-amber-600 mt-0.5">📝 {item.specialInstructions}</span>
                      )}
                    </span>
                    <span className="text-gray-500 ml-3">Rs. {fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700">📝 {order.notes}</p>
                </div>
              )}

              <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-sm">Rs. {fmt(total)}</span>
              </div>

              {!['Completed', 'Cancelled'].includes(order.status) && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const WaiterDashboard = () => {
  const { user } = useAuth();

  // ── Remote data ──────────────────────────────────────────────────────────
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('floorplan'); // 'floorplan' | 'order' | 'orders'
  const [viewModal, setViewModal] = useState({ open: false, table: null, order: null });

  // ── New Order state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);            // [{ _id, name, price, qty, note }]
  const [orderType, setOrderType] = useState('DineIn');
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [tablesRes, ordersRes, catsRes, itemsRes] = await Promise.all([
        API.get('/tables'),
        API.get('/orders?status=Pending,Cooking,Ready,Served'),
        API.get('/categories'),
        API.get('/items'),
      ]);
      setTables(tablesRes.data.data || []);
      setActiveOrders(ordersRes.data.data || []);
      setCategories(catsRes.data || []);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
    } catch (err) {
      console.error('Waiter fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Filtered menu items ───────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    const matchSearch = !search.trim() || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || String(item.category) === String(activeCategory);
    return matchSearch && matchCat;
  });

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c._id === item._id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { _id: item._id, name: item.name, price: item.price, qty: 1, note: '' }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c._id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const updateNote = (id, note) => {
    setCart((prev) => prev.map((c) => (c._id === id ? { ...c, note } : c)));
  };

  const removeItem = (id) => setCart((prev) => prev.filter((c) => c._id !== id));

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setIsUrgent(false);
    setSelectedTable(null);
    setOrderType('DineIn');
  };

  const getCartQty = (id) => cart.find((c) => c._id === id)?.qty || 0;

  // ── Table click handler ───────────────────────────────────────────────────
  const handleTableClick = (table) => {
    if (table.status === 'Available') {
      setSelectedTable(table);
      setOrderType('DineIn');
      setActiveTab('order');
      toast(`📋 Creating order for Table ${table.tableNumber}`, { duration: 2000 });
    } else if (table.status === 'Occupied') {
      const order = activeOrders.find(
        (o) =>
          o.tableNumber === table.tableNumber &&
          !['Completed', 'Cancelled'].includes(o.status)
      );
      setViewModal({ open: true, table, order: order || null });
    }
  };

  // ── Submit to kitchen ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (orderType === 'DineIn' && !selectedTable) { toast.error('Select a table first'); return; }

    setSubmitting(true);
    try {
      await API.post('/orders', {
        orderType,
        tableNumber: orderType === 'DineIn' ? selectedTable?.tableNumber : undefined,
        numberOfGuests: selectedTable?.capacity || 1,
        customerName: customerName || (orderType === 'DineIn' ? 'Dine-in Guest' : 'Walk-in Customer'),
        items: cart.map((c) => ({
          itemId: c._id,
          quantity: c.qty,
          specialInstructions: c.note || '',
        })),
        isUrgent,
      });

      const msg =
        orderType === 'DineIn'
          ? `Order sent to kitchen — Table ${selectedTable.tableNumber}`
          : 'Order sent to kitchen';
      toast.success(msg);

      clearCart();
      setSearch('');
      setActiveCategory('all');
      setActiveTab('floorplan');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    available: tables.filter((t) => t.status === 'Available').length,
    occupied:  tables.filter((t) => t.status === 'Occupied').length,
    reserved:  tables.filter((t) => t.status === 'Reserved').length,
    active:    activeOrders.length,
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'floorplan', icon: LayoutGrid,    label: 'Floor Plan',    badge: tables.length },
    { key: 'order',     icon: ChefHat,       label: 'New Order',     badge: cart.length || undefined },
    { key: 'orders',    icon: ClipboardList, label: 'Active Orders', badge: activeOrders.length },
  ];

  return (
    <div className="p-6 lg:p-8 min-h-full">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiter Station</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Available',     value: stats.available, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Occupied',      value: stats.occupied,  icon: Users,       color: 'text-red-500'     },
          { label: 'Reserved',      value: stats.reserved,  icon: Clock,       color: 'text-amber-500'   },
          { label: 'Active Orders', value: stats.active,    icon: ChefHat,     color: 'text-blue-500'    },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ key, icon: Icon, label, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === key ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Icon size={14} />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Floor Plan                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'floorplan' && (
        loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <div className="py-24 text-center">
            <AlertCircle size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">No tables configured</p>
            <p className="text-xs text-gray-300 mt-1">Ask admin to add tables in the system</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              Tap an <span className="text-emerald-600 font-semibold">available</span> table to create a new order.
              Tap an <span className="text-red-500 font-semibold">occupied</span> table to view its order.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map((table) => {
                const cfg = TABLE_STATUS_STYLE[table.status] || TABLE_STATUS_STYLE.Available;
                const linked = activeOrders.find(
                  (o) =>
                    o.tableNumber === table.tableNumber &&
                    !['Completed', 'Cancelled'].includes(o.status)
                );
                return (
                  <button
                    key={table._id}
                    onClick={() => handleTableClick(table)}
                    disabled={table.status === 'Maintenance' || table.status === 'Reserved'}
                    className={`text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${cfg.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl font-black text-gray-700">T{table.tableNumber}</span>
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${cfg.dot}`} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {table.section} · {table.capacity} seats
                    </p>
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                      {table.status}
                    </span>
                    {linked && (
                      <p className={`mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${ORDER_STATUS_BADGE[linked.status] || 'bg-gray-100 text-gray-500'}`}>
                        {linked.status}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: New Order                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'order' && (
        <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 340px)' }}>

          {/* ── Left: Menu Panel ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Active table banner */}
            {selectedTable && orderType === 'DineIn' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Creating order for Table {selectedTable.tableNumber}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {selectedTable.section} · {selectedTable.capacity} seats
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedTable(null); setOrderType('DineIn'); }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline"
                >
                  Change table
                </button>
              </div>
            ) : orderType !== 'DineIn' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
                <p className="text-sm font-bold text-blue-800">
                  {orderType === 'WalkIn' ? '🚶 Walk-In Order' : '🛵 Delivery Order'}
                </p>
                <p className="text-xs text-blue-600">No table required · Change order type in the cart</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                <p className="text-sm font-bold text-amber-800">Select a table in the cart panel</p>
                <p className="text-xs text-amber-600">
                  Or go to{' '}
                  <button onClick={() => setActiveTab('floorplan')} className="underline font-semibold">
                    Floor Plan
                  </button>
                  {' '}and tap an available table
                </p>
              </div>
            )}

            {/* Search */}
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); if (v) setActiveCategory('all'); }}
              placeholder="Search menu items…"
            />

            {/* Category filter */}
            <CategoryFilter
              categories={categories}
              activeId={activeCategory}
              onSelect={(id) => { setActiveCategory(id); setSearch(''); }}
            />

            {/* Menu grid — scrollable */}
            <div className="flex-1 overflow-y-auto">
              <MenuGrid
                items={filteredItems}
                onAdd={addToCart}
                getCartQty={getCartQty}
                loading={loading}
                cols="3"
              />
            </div>
          </div>

          {/* ── Right: Cart Panel ── */}
          <div className="w-80 xl:w-96 shrink-0">
            <div className="sticky top-4">
              <CartPanel
                cart={cart}
                onChangeQty={changeQty}
                onUpdateNote={updateNote}
                onRemove={removeItem}
                onClearCart={clearCart}
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
                orderType={orderType}
                onSetOrderType={(t) => { setOrderType(t); if (t !== 'DineIn') setSelectedTable(null); }}
                customerName={customerName}
                onSetCustomerName={setCustomerName}
                isUrgent={isUrgent}
                onSetIsUrgent={setIsUrgent}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Active Orders                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {/* Column headers */}
          <div className="grid grid-cols-5 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Order #</span>
            <span>Table / Type</span>
            <span>Items</span>
            <span>Status</span>
            <span className="text-right">Time</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="py-20 text-center">
              <ChefHat size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No active orders right now</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeOrders.map((order) => (
                <div
                  key={order._id}
                  className="grid grid-cols-5 px-5 py-4 items-center hover:bg-gray-50 transition-colors"
                >
                  {/* Order # */}
                  <div>
                    <p className="text-sm font-bold text-gray-800">#{order.orderNumber}</p>
                    {order.isUrgent && (
                      <span className="text-[10px] font-bold text-red-500">URGENT</span>
                    )}
                  </div>

                  {/* Table / type */}
                  <div>
                    {order.tableNumber ? (
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                        T-{order.tableNumber}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{order.orderType}</span>
                    )}
                    {order.customerName && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{order.customerName}</p>
                    )}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-sm text-gray-600">{order.items?.length} item(s)</p>
                    <p className="text-xs text-gray-400 truncate">
                      {order.items?.slice(0, 2).map((i) => i.itemName).join(', ')}
                      {order.items?.length > 2 ? `…` : ''}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold w-fit ${ORDER_STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-500'}`}>
                    {order.status}
                  </span>

                  {/* Time */}
                  <p className="text-xs text-gray-400 text-right">
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Order view modal ── */}
      {viewModal.open && (
        <OrderViewModal
          table={viewModal.table}
          order={viewModal.order}
          onClose={() => setViewModal({ open: false, table: null, order: null })}
          onCancelled={() => {
            setViewModal({ open: false, table: null, order: null });
            fetchAll();
          }}
        />
      )}
    </div>
  );
};

export default WaiterDashboard;
