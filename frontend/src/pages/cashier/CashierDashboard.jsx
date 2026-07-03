import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent, useSocket } from '../../hooks/useSocket';
import API from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, RefreshCw, CreditCard, DollarSign,
  Wifi, WifiOff, X, Receipt, Printer, ChevronDown,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const diffMin = (a, b) => a && b ? Math.round((new Date(a) - new Date(b)) / 60000) : null;

const PAYMENT_METHODS = ['Cash', 'Card', 'Online', 'Wallet'];

// ── Payment Modal ─────────────────────────────────────────────────────────────
const PaymentModal = ({ order, onClose, onPaid }) => {
  const [method,    setMethod]    = useState('Cash');
  const [reference, setReference] = useState('');
  const [discount,  setDiscount]  = useState('');
  const [discType,  setDiscType]  = useState('fixed');
  const [amountIn,  setAmountIn]  = useState('');
  const [paying,    setPaying]    = useState(false);

  const base         = order.totalAmount || 0;
  const discAmt      = discType === 'percentage'
    ? base * (parseFloat(discount) || 0) / 100
    : parseFloat(discount) || 0;
  const grandTotal   = Math.max(0, base - discAmt);
  const change       = Math.max(0, (parseFloat(amountIn) || 0) - grandTotal);

  const handlePay = async () => {
    setPaying(true);
    try {
      await API.post(`/orders/${order._id}/complete`, {
        paymentMethod:        method,
        amountPaid:           parseFloat(amountIn) || grandTotal,
        transactionReference: reference || undefined,
        discountType:         discount  ? discType  : undefined,
        discountValue:        discount  ? parseFloat(discount) : undefined,
      });
      toast.success(`Payment collected — ${fmt(grandTotal)} via ${method}`);
      onPaid(order._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900 text-lg">Collect Payment</h3>
            <p className="text-xs text-gray-400 mt-0.5">Table T-{order.tableNumber || '?'} · #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">

          {/* Bill summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bill Summary</p>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
              {order.customerName && <span>Customer: <strong className="text-gray-700">{order.customerName}</strong></span>}
              {order.waiterId?.name && <span>Waiter: <strong className="text-gray-700">{order.waiterId.name}</strong></span>}
              {order.readyAt  && <span>Kitchen ready: <strong className="text-gray-700">{fmtTime(order.readyAt)}</strong></span>}
              {order.servedAt && <span>Served at: <strong className="text-gray-700">{fmtTime(order.servedAt)}</strong></span>}
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100 mt-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5">
                  <span className="text-gray-700">{item.itemName} <span className="text-gray-400">× {item.quantity}</span></span>
                  <span className="font-semibold text-gray-900">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{fmt(order.subtotal || base)}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax</span><span>{fmt(order.taxAmount)}</span>
                </div>
              )}
              {discAmt > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span><span>- {fmt(discAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 pt-1">
                <span>Grand Total</span><span>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Discount (optional) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Discount (optional)</label>
            <div className="flex gap-2">
              <select value={discType} onChange={(e) => setDiscType(e.target.value)}
                className="h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white">
                <option value="fixed">Rs Fixed</option>
                <option value="percentage">% Percent</option>
              </select>
              <input
                type="number" min="0" placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${method === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount received (cash) */}
          {method === 'Cash' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Amount Received</label>
              <input
                type="number" min="0" placeholder={String(grandTotal)}
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-indigo-400"
              />
              {change > 0 && (
                <p className="text-sm font-bold text-emerald-600 mt-1.5">Change: {fmt(change)}</p>
              )}
            </div>
          )}

          {/* Transaction reference */}
          {method !== 'Cash' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Reference / Transaction ID
              </label>
              <input
                type="text" placeholder="e.g. TXN-123456"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? <><RefreshCw size={16} className="animate-spin" /> Processing…</> : `Collect ${fmt(grandTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Bill Detail Modal ─────────────────────────────────────────────────────────
const BillDetailModal = ({ bill, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Bill ${bill.orderNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;padding:20px;width:300px}
.center{text-align:center}h2{font-size:16px}p{font-size:12px;margin:2px 0}
hr{border:none;border-top:1px dashed #999;margin:8px 0}
.row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
.total{font-size:14px;font-weight:bold}</style></head><body>
<div class="center"><h2>RECEIPT</h2>
<p>Table T-${bill.tableNo || bill.tableNumber || '?'} · ${bill.orderNumber}</p>
<p>${new Date(bill.paidAt || bill.createdAt).toLocaleString()}</p></div><hr>
${(bill.items || []).map((i) => `<div class="row"><span>${i.name || i.itemName} ×${i.quantity}</span><span>Rs ${(i.price * i.quantity).toLocaleString()}</span></div>`).join('')}
<hr><div class="row total"><span>TOTAL</span><span>Rs ${(bill.grandTotal || bill.totalAmount || 0).toLocaleString()}</span></div>
<div class="row"><span>Method</span><span>${bill.paymentMethod || '—'}</span></div>
${bill.paidBy?.name || bill.paidByName ? `<div class="row"><span>Cashier</span><span>${bill.paidByName || bill.paidBy?.name}</span></div>` : ''}
<hr><div class="center"><p>Thank you!</p></div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">Bill — #{bill.orderNumber}</h3>
            <p className="text-xs text-green-600 font-semibold mt-0.5">✓ Paid via {bill.paymentMethod}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Print receipt">
              <Printer size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>Table: <strong className="text-gray-800">T-{bill.tableNo || '?'}</strong></span>
            <span>Paid: <strong className="text-gray-800">{fmtTime(bill.paidAt)}</strong></span>
            {bill.customerName && <span>Customer: <strong className="text-gray-800">{bill.customerName}</strong></span>}
            {bill.waiterName   && <span>Waiter: <strong className="text-gray-800">{bill.waiterName}</strong></span>}
          </div>
          <div className="divide-y divide-gray-100">
            {bill.items?.map((i, idx) => (
              <div key={idx} className="flex justify-between py-1.5">
                <span className="text-gray-700">{i.name || i.itemName} <span className="text-gray-400">×{i.quantity}</span></span>
                <span className="font-semibold">{fmt(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 font-black text-base flex justify-between">
            <span>Grand Total</span><span>{fmt(bill.grandTotal || bill.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main CashierDashboard ─────────────────────────────────────────────────────
const CashierDashboard = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { connected } = useSocket();

  const [servedOrders, setServedOrders] = useState([]);  // awaiting payment
  const [recentBills,  setRecentBills]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [payModal,     setPayModal]     = useState(null); // order object
  const [billModal,    setBillModal]    = useState(null); // bill object

  const load = useCallback(async () => {
    try {
      const [ordersRes, billsRes] = await Promise.all([
        API.get('/orders?status=Served'),
        API.get('/bills?limit=20'),
      ]);
      setServedOrders(ordersRes.data.data || []);
      setRecentBills(billsRes.data?.data || billsRes.data || []);
    } catch (err) {
      console.error('Cashier load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Socket events ─────────────────────────────────────────────────────────
  // Waiter served an order → add to payment queue with a loud toast
  useSocketEvent('order:served', (payload) => {
    const { orderId, orderNumber, tableNumber, grandTotal } = payload;
    setServedOrders((prev) => {
      if (prev.find((o) => o._id === orderId)) return prev;
      return [{ _id: orderId, orderNumber, tableNumber, totalAmount: grandTotal, status: 'Served', servedAt: new Date() }, ...prev];
    });
    toast(`✅ Table T-${tableNumber || '?'} served · ${fmt(grandTotal)}`, {
      duration: 10000,
      style: { background: '#1e3a5f', color: '#fff', fontWeight: 700 },
    });
  });

  // Bill created (older flow or from completeOrder) → refresh bills
  useSocketEvent('bill:created', () => load());

  // Payment processed → remove from served queue, refresh bills
  useSocketEvent('bill:paid', ({ orderId }) => {
    if (orderId) setServedOrders((prev) => prev.filter((o) => o._id !== orderId));
    load();
  });

  // Table became available → update any linked order indicators
  useSocketEvent('table:available', ({ tableNumber }) => {
    setServedOrders((prev) => prev.filter((o) => o.tableNumber !== tableNumber));
  });

  // order:status:changed (Completed) → remove from queue
  useSocketEvent('order:status:changed', ({ orderId, status }) => {
    if (status === 'Completed' || status === 'Cancelled') {
      setServedOrders((prev) => prev.filter((o) => o._id !== orderId));
    }
  });

  const handlePaid = (orderId) => {
    setServedOrders((prev) => prev.filter((o) => o._id !== orderId));
    load();
  };

  const stats = {
    pending:  servedOrders.length,
    todaySales: recentBills
      .filter((b) => b.paymentStatus === 'paid' && new Date(b.paidAt || b.createdAt) > new Date(Date.now() - 86400000))
      .reduce((s, b) => s + (b.grandTotal || 0), 0),
    totalBills: recentBills.length,
  };

  return (
    <div className="p-6 lg:p-8 min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashier Station</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-red-400" />}
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">
            <RefreshCw size={14} />Refresh
          </button>
          <button onClick={() => navigate('/cashier/bills')} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-gray-900 text-white hover:bg-gray-800">
            <Receipt size={14} />All Bills
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Awaiting Payment', value: stats.pending,    icon: Clock,         cls: stats.pending > 0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-gray-500' },
          { label: "Today's Revenue",  value: fmt(stats.todaySales), icon: DollarSign, cls: 'text-emerald-600' },
          { label: 'Bills Today',      value: stats.totalBills, icon: Receipt,        cls: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-4 shadow-sm bg-white ${s.cls?.includes('bg-') ? s.cls : 'border-gray-100 bg-white'}`}>
            <s.icon size={20} className={s.cls?.includes('text-') ? s.cls.split(' ')[0] : 'text-gray-400'} />
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Payment Queue ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${servedOrders.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`} />
          Payment Queue
          {servedOrders.length > 0 && (
            <span className="ml-1 text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {servedOrders.length}
            </span>
          )}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : servedOrders.length === 0 ? (
          <div className="py-16 text-center bg-white border border-gray-100 rounded-2xl">
            <CheckCircle size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-semibold">No orders waiting for payment</p>
            <p className="text-xs text-gray-300 mt-1">Served orders will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servedOrders.map((order) => {
              const wait = order.servedAt ? diffMin(new Date(), order.servedAt) : null;
              return (
                <div key={order._id}
                  className={`bg-white border-2 rounded-2xl p-5 shadow-sm transition-all ${
                    wait !== null && wait > 10 ? 'border-red-200 bg-red-50/20' : 'border-amber-200'
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xl font-black text-gray-900">Table T-{order.tableNumber || '?'}</span>
                        <span className="font-mono text-sm text-gray-400">#{order.orderNumber}</span>
                        {wait !== null && wait > 10 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Waiting {wait}m
                          </span>
                        )}
                      </div>
                      {order.customerName && (
                        <p className="text-sm text-gray-500">{order.customerName}</p>
                      )}
                      {order.waiterId?.name && (
                        <p className="text-xs text-gray-400">Waiter: {order.waiterId.name}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {order.servedAt && <span>Served: {fmtTime(order.servedAt)}</span>}
                        {order.readyAt  && <span>Kitchen: {fmtTime(order.readyAt)}</span>}
                      </div>
                      <p className="text-base font-black text-gray-900">{fmt(order.totalAmount)}</p>
                    </div>

                    <button
                      onClick={() => setPayModal(order)}
                      className="shrink-0 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                      <CreditCard size={15} /> Collect Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Bills ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Recent Bills</h2>
        {recentBills.length === 0 ? (
          <div className="py-12 text-center bg-white border border-gray-100 rounded-2xl">
            <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No bills yet today</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-6 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>Order #</span>
              <span>Table</span>
              <span>Customer</span>
              <span>Method</span>
              <span>Total</span>
              <span className="text-right">Paid At</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentBills.slice(0, 20).map((bill) => (
                <button
                  key={bill._id}
                  onClick={() => setBillModal(bill)}
                  className="w-full grid grid-cols-6 px-5 py-3 text-left hover:bg-gray-50 transition-colors items-center"
                >
                  <span className="text-sm font-bold text-gray-800">#{bill.orderNumber || '—'}</span>
                  <span className="text-sm text-gray-600">T-{bill.tableNo || '—'}</span>
                  <span className="text-sm text-gray-500 truncate">{bill.customerName || '—'}</span>
                  <span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      bill.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {bill.paymentMethod || (bill.paymentStatus === 'paid' ? 'Paid' : 'Pending')}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-gray-900">{fmt(bill.grandTotal || bill.totalAmount)}</span>
                  <span className="text-xs text-gray-400 text-right">{fmtTime(bill.paidAt || bill.createdAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {payModal  && <PaymentModal  order={payModal}  onClose={() => setPayModal(null)}  onPaid={handlePaid} />}
      {billModal && <BillDetailModal bill={billModal} onClose={() => setBillModal(null)} />}
    </div>
  );
};

export default CashierDashboard;
