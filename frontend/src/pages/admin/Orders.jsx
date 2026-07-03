import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import {
  RefreshCw, XCircle, Clock, ChefHat, CheckCircle,
  ShoppingBag, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import OrderTimeline from "../../components/OrderTimeline";

const STATUS_CFG = {
  Pending:   { label: "Pending",   badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-400"   },
  Cooking:   { label: "Preparing", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-400"  },
  Ready:     { label: "Ready",     badge: "bg-green-100 text-green-700",   dot: "bg-green-400"   },
  Served:    { label: "Served",    badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-400"    },
  Completed: { label: "Completed", badge: "bg-gray-100 text-gray-500",     dot: "bg-gray-300"    },
  Cancelled: { label: "Cancelled", badge: "bg-red-100 text-red-600",       dot: "bg-red-400"     },
};

const TYPE_CFG = {
  DineIn:   { label: "Dine-In",   color: "bg-indigo-50 text-indigo-700"  },
  WalkIn:   { label: "Walk-In",   color: "bg-sky-50 text-sky-700"        },
  Delivery: { label: "Delivery",  color: "bg-orange-50 text-orange-700"  },
  TakeAway: { label: "Take-Away", color: "bg-teal-50 text-teal-700"      },
};

const TABS = ["All", "Pending", "Cooking", "Ready", "Completed", "Cancelled"];

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
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest truncate">{label}</p>
      <p className="text-xl font-black text-gray-900">{value ?? 0}</p>
    </div>
  </div>
);

const Orders = () => {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("All");
  const [expandedTimelines, setExpandedTimelines] = useState({});
  const toggleTimeline = (id) => setExpandedTimelines((prev) => ({ ...prev, [id]: !prev[id] }));

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
    const timer = setInterval(fetchOrders, 30_000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

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
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Order Monitor</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Read-only view · Order completion and cancellation is handled by the Manager · auto-refreshes every 30 s
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Monitor-only notice */}
      <div className="mb-4 flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <Eye size={14} className="text-indigo-500 shrink-0" />
        <p className="text-[11px] text-indigo-700">
          <strong>Admin view is monitor-only.</strong> To complete or cancel an order, the Manager must use the Manager Dashboard → Orders.
        </p>
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

      {/* Tabs */}
      <div className="bg-white border border-gray-200 shadow-sm px-4 mb-4 flex flex-wrap gap-0 border-b-0 overflow-x-auto">
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
            <div key={i} className="h-56 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-700">No orders found</h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === "All"
              ? "No orders placed today yet"
              : `No ${activeTab === "Cooking" ? "Preparing" : activeTab} orders`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((order) => {
            const typeCfg = TYPE_CFG[order.orderType] || { label: order.orderType, color: "bg-gray-100 text-gray-600" };
            const orderId = order.orderNumber || String(order._id).slice(-8).toUpperCase();

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
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeCfg.color}`}>
                      {typeCfg.label}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1">

                  {/* Customer / table */}
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

                  {/* Items preview */}
                  <div className="space-y-1 mb-3 flex-1">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate">{item.itemName}</span>
                        <span className="text-gray-400 ml-2 shrink-0">×{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Status notes */}
                  <div className="mt-auto pt-2">
                    {order.status === "Cancelled" && (
                      <>
                        {(order.cancellationReason || order.notes) && (
                          <p className="text-[10px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 mb-1 italic truncate">
                            Reason: {order.cancellationReason || order.notes}
                          </p>
                        )}
                        {order.cancelledBy && (
                          <p className="text-[10px] text-gray-400 text-center">
                            Cancelled by {order.cancelledBy?.name || "Manager"}
                          </p>
                        )}
                      </>
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

                    {/* Timeline toggle */}
                    {order.timeline?.length > 0 && (
                      <div className="mt-2 border-t border-gray-100 pt-2">
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

    </div>
  );
};

export default Orders;
