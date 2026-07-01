import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

const fmt = (n) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n || 0);

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const PAY_COLOR = {
  Cash: "bg-green-100 text-green-700",
  Card: "bg-blue-100 text-blue-700",
};

const CashierDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await API.get("/bills");
        setBills(Array.isArray(data) ? data : []);
      } catch {
        // silently show zeros
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const todayBills   = bills.filter((b) => isToday(b.createdAt) && b.status !== "void");
  const todayRevenue = todayBills.reduce((s, b) => s + (b.grandTotal || b.totalAmount || 0), 0);
  const recentBills  = bills.filter((b) => b.status !== "void").slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">
          Welcome, {user?.name || "Cashier"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-PK", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-black text-white rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Today's Bills</p>
          <p className="text-4xl font-black mt-2">
            {loading ? <span className="opacity-30">—</span> : todayBills.length}
          </p>
          <p className="text-xs text-gray-500 mt-2">Completed transactions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Today's Revenue</p>
          <p className="text-3xl font-black mt-2 text-gray-900">
            {loading ? <span className="opacity-30">—</span> : `Rs ${fmt(todayRevenue)}`}
          </p>
          <p className="text-xs text-gray-400 mt-2">Gross sales today</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/pos/menu")}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors"
          >
            <span className="text-3xl">🛒</span>
            <span className="text-sm font-bold">Open POS</span>
            <span className="text-[11px] text-gray-400">Create new bill</span>
          </button>
          <button
            onClick={() => navigate("/pos/bills")}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span className="text-3xl">🧾</span>
            <span className="text-sm font-bold text-gray-800">Bills History</span>
            <span className="text-[11px] text-gray-500">View &amp; reprint</span>
          </button>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Bills</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : recentBills.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No bills yet</p>
        ) : (
          <div className="space-y-2">
            {recentBills.map((bill) => (
              <div
                key={bill._id}
                onClick={() => navigate(`/pos/print/${bill._id}`)}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Table {bill.tableNo} &nbsp;·&nbsp; {bill.items?.length || 0} item(s)
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(bill.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      PAY_COLOR[bill.paymentMethod] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {bill.paymentMethod}
                  </span>
                  <span className="text-sm font-black text-gray-900">
                    Rs {fmt(bill.grandTotal || bill.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierDashboard;
