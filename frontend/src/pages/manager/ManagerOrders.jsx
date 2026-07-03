import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  RefreshCw, XCircle, CheckCircle, Clock, ChefHat,
  ShoppingBag, X, Loader2, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import OrderTimeline from "../../components/OrderTimeline";

const STATUS_CFG = {
  Pending:   { label: "Pending",   badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-400"   },
  Cooking:   { label: "Preparing", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-400"  },
  Ready:     { label: "Ready",     badge: "bg-green-100 text-green-700",   dot: "bg-green-400"   },
  Served:    { label: "Served",    badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-400"    },
  Completed: { label: "Completed", badge: "bg-gray-100 text-gray-600",     dot: "bg-gray-300"    },
  Cancelled: { label: "Cancelled", badge: "bg-red-100 text-red-600",       dot: "bg-red-400"     },
};

const TYPE_LABEL = {
  DineIn: "Dine-In", WalkIn: "Walk-In", Delivery: "Delivery", TakeAway: "Take-Away",
};

const PAYMENT_METHODS = ["Cash", "Card", "Online", "Wallet"];
const CANCELLABLE     = ["Pending", "Cooking", "Ready", "Served"];
const COMPLETABLE     = ["Pending", "Cooking", "Ready", "Served"];
const TABS            = ["All", "Pending", "Cooking", "Ready", "Completed", "Cancelled"];

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || { label: status, badge: "bg-gray-100 text-gray-600", dot: "bg-gray-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, iconBg }) => (
  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon size={16} className="text-white" />
    </div>
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-gray-900">{value ?? 0}</p>
    </div>
  </div>
);

const ManagerOrders = () => {
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState("All");
  const [expandedTimelines, setExpandedTimelines] = useState({});
  const toggleTimeline = (id) => setExpandedTimelines((prev) => ({ ...prev, [id]: !prev[id] }));

  // Complete flow
  const [completeTarget, setCompleteTarget] = useState(null);
  const [payMethod, setPayMethod]           = useState("Cash");
  const [amountPaid, setAmountPaid]         = useState("");
  const [completing, setCompleting]         = useState(false);

  // Cancel flow
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling]     = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await API.get("/orders?date=today");
      setOrders(data.data || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 30_000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  // ── Complete ──────────────────────────────────────────────────────────────────
  const openComplete = (order) => {
    setCompleteTarget(order);
    setPayMethod("Cash");
    setAmountPaid(String(Math.round(order.totalAmount || 0)));
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await API.post(`/orders/${completeTarget._id}/complete`, {
        paymentMethod: payMethod,
        amountPaid: parseFloat(amountPaid) || completeTarget.totalAmount,
      });
      const label = completeTarget.orderNumber || String(completeTarget._id).slice(-6).toUpperCase();
      toast.success(`Order #${label} marked as completed`);
      setCompleteTarget(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete order");
    } finally {
      setCompleting(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────────
  const openCancel = (order) => {
    setCancelTarget(order);
    setCancelReason("");
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      toast.error("A cancellation reason is required");
      return;
    }
    setCancelling(true);
    try {
      await API.post(`/orders/${cancelTarget._id}/cancel`, { reason: cancelReason.trim() });
      const label = cancelTarget.orderNumber || String(cancelTarget._id).slice(-6).toUpperCase();
      toast.success(`Order #${label} cancelled`);
      setCancelTarget(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const visible = activeTab === "All"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const fmt = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;

  const timeAgo = (date) => {
    const s = (Date.now() - new Date(date).getTime()) / 1000;
    if (s < 60)   return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Order Operations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manager · Complete or cancel customer orders · auto-refreshes every 30 s
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Total"     value={orders.length}         icon={ShoppingBag}  iconBg="bg-gray-800"   />
        <StatCard label="Pending"   value={counts.Pending   || 0} icon={Clock}        iconBg="bg-amber-500"  />
        <StatCard label="Preparing" value={counts.Cooking   || 0} icon={ChefHat}      iconBg="bg-purple-500" />
        <StatCard label="Ready"     value={counts.Ready     || 0} icon={CheckCircle}  iconBg="bg-green-500"  />
        <StatCard label="Completed" value={counts.Completed || 0} icon={CheckCircle}  iconBg="bg-blue-500"   />
        <StatCard label="Cancelled" value={counts.Cancelled || 0} icon={XCircle}      iconBg="bg-red-500"    />
      </div>

      {/* Authority notice */}
      <div className="mb-4 flex items-start gap-2.5 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="text-violet-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-violet-700 leading-relaxed">
          <strong>Manager Authority:</strong> Only you can complete or cancel customer orders.
          All actions are logged with your ID and timestamp. Cancellations require a mandatory reason.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 shadow-sm px-4 mb-4 flex flex-wrap gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const tabCount = tab === "All" ? orders.length : (counts[tab] || 0);
          const tabLabel = tab === "Cooking" ? "Preparing" : tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {tabLabel}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab ? "bg-black text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {tabCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-700">No orders</h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === "All"
              ? "No orders placed today yet"
              : `No ${activeTab === "Cooking" ? "Preparing" : activeTab} orders`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((order) => {
            const canComplete = COMPLETABLE.includes(order.status);
            const canCancel   = CANCELLABLE.includes(order.status);
            const typeLabel   = TYPE_LABEL[order.orderType] || order.orderType;
            const orderId     = order.orderNumber || String(order._id).slice(-8).toUpperCase();

            return (
              <div
                key={order._id}
                className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Card header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-xs font-mono font-bold text-gray-800">#{orderId}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {typeLabel}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1">

                  {/* Customer + total */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {order.customerName || "Walk-in Customer"}
                      </p>
                      {order.tableNumber && (
                        <p className="text-xs text-gray-400">Table {order.tableNumber}</p>
                      )}
                      {order.customerPhone && (
                        <p className="text-xs text-gray-400">{order.customerPhone}</p>
                      )}
                    </div>
                    <p className="text-base font-black text-gray-900 ml-3 shrink-0">
                      {fmt(order.totalAmount)}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-3 flex-1">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate">{item.itemName}</span>
                        <span className="text-gray-400 ml-2 shrink-0">×{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{order.items.length - 3} more</p>
                    )}
                  </div>

                  {/* Cancellation reason (historical) */}
                  {order.status === "Cancelled" && order.cancellationReason && (
                    <p className="text-[10px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 mb-3 italic">
                      Reason: {order.cancellationReason}
                    </p>
                  )}

                  {/* Actions — pinned to card bottom */}
                  <div className="mt-auto pt-2 space-y-2">
                    {canComplete && (
                      <button
                        onClick={() => openComplete(order)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 rounded-lg transition-all"
                      >
                        <CheckCircle size={13} /> Mark as Completed
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => openCancel(order)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-lg transition-all"
                      >
                        <XCircle size={13} /> Cancel Order
                      </button>
                    )}
                    {order.status === "Completed" && (
                      <p className="text-center text-[11px] text-emerald-600 font-medium py-1">
                        Completed{" "}
                        {order.completedAt
                          ? new Date(order.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                        {order.completedBy && ` · by ${order.completedBy?.name || "Manager"}`}
                      </p>
                    )}
                    {order.status === "Cancelled" && (
                      <p className="text-center text-[11px] text-red-500 font-medium py-1">
                        Order cancelled
                        {order.cancelledBy && ` · by ${order.cancelledBy?.name || "Manager"}`}
                      </p>
                    )}

                    {/* Timeline toggle */}
                    {order.timeline?.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={() => toggleTimeline(order._id)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors w-full"
                        >
                          {expandedTimelines[order._id]
                            ? <><ChevronUp size={10} /> Hide Timeline</>
                            : <><ChevronDown size={10} /> Show Timeline ({order.timeline.length} steps)</>
                          }
                        </button>
                        {expandedTimelines[order._id] && (
                          <div className="mt-2">
                            <OrderTimeline timeline={order.timeline} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Complete Order Modal ────────────────────────────────────────────────── */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Complete Order</h2>
              </div>
              <button onClick={() => setCompleteTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold font-mono text-gray-900">
                    #{completeTarget.orderNumber || String(completeTarget._id).slice(-8).toUpperCase()}
                  </p>
                  <StatusBadge status={completeTarget.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{TYPE_LABEL[completeTarget.orderType] || completeTarget.orderType}</span>
                  {completeTarget.tableNumber && <span>· Table {completeTarget.tableNumber}</span>}
                  <span>· {completeTarget.items.length} item{completeTarget.items.length !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-xl font-black text-gray-900 mt-2">{fmt(completeTarget.totalAmount)}</p>
              </div>

              {/* Order timeline (if available) */}
              {completeTarget.timeline?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Order Journey</p>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <OrderTimeline timeline={completeTarget.timeline} />
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`h-10 rounded-xl text-sm font-semibold border transition-all ${
                        payMethod === m
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount paid */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Amount Paid
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">Rs</span>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                  />
                </div>
                {parseFloat(amountPaid) > completeTarget.totalAmount && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                    Change: {fmt(parseFloat(amountPaid) - completeTarget.totalAmount)}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCompleteTarget(null)}
                  className="flex-1 h-10 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmComplete}
                  disabled={completing}
                  className="flex-1 h-10 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {completing
                    ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                    : <><CheckCircle size={14} /> Confirm & Complete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Order Modal ──────────────────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle size={18} className="text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Cancel Order</h2>
              </div>
              <button onClick={() => setCancelTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold font-mono text-gray-900">
                    #{cancelTarget.orderNumber || String(cancelTarget._id).slice(-8).toUpperCase()}
                  </p>
                  <StatusBadge status={cancelTarget.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{TYPE_LABEL[cancelTarget.orderType] || cancelTarget.orderType}</span>
                  {cancelTarget.tableNumber && <span>· Table {cancelTarget.tableNumber}</span>}
                  <span className="font-bold text-gray-700">· {fmt(cancelTarget.totalAmount)}</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Required — e.g. Customer requested cancellation, item unavailable, duplicate order…"
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-gray-400 resize-none transition-colors ${
                    cancelReason.trim() ? "border-gray-400" : "border-gray-200"
                  }`}
                />
                {!cancelReason.trim() && (
                  <p className="text-[11px] text-red-400 mt-1">A reason is required to cancel an order</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 h-10 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling || !cancelReason.trim()}
                  className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling
                    ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</>
                    : <><XCircle size={14} /> Confirm Cancel</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerOrders;
