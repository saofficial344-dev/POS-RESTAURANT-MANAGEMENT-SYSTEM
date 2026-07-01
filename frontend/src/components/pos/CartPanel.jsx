import { Plus, Minus, X, Send, ChefHat } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n || 0);

// ── Cart Item Row ─────────────────────────────────────────────────────────────
const CartItem = ({ item, onChangeQty, onUpdateNote, onRemove }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-400">Rs. {fmt(item.price)} each</p>
      </div>
      <button
        onClick={() => onRemove(item._id)}
        className="shrink-0 w-6 h-6 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors"
      >
        <X size={12} />
      </button>
    </div>

    {/* Qty controls */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangeQty(item._id, -1)}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Minus size={12} />
        </button>
        <span className="text-sm font-bold text-gray-800 w-6 text-center">{item.qty}</span>
        <button
          onClick={() => onChangeQty(item._id, 1)}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
      <span className="text-sm font-bold text-gray-900">Rs. {fmt(item.price * item.qty)}</span>
    </div>

    {/* Per-item note */}
    <input
      type="text"
      value={item.note || ''}
      onChange={(e) => onUpdateNote(item._id, e.target.value)}
      placeholder="e.g. No onion, extra sauce…"
      maxLength={100}
      className="w-full h-7 px-2.5 text-xs rounded-lg border border-dashed border-gray-200 outline-none focus:border-gray-400 bg-gray-50 placeholder-gray-300 transition-colors"
    />
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const CartPanel = ({
  cart,
  onChangeQty,
  onUpdateNote,
  onRemove,
  onClearCart,
  // Table / order config
  tables = [],
  selectedTable,
  onSelectTable,
  orderType,
  onSetOrderType,
  customerName,
  onSetCustomerName,
  isUrgent,
  onSetIsUrgent,
  // Submit
  onSubmit,
  submitting = false,
}) => {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const availableTables = tables.filter((t) => t.status === 'Available');

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Order Cart</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {cart.length === 0 ? 'No items added' : `${cart.reduce((s, c) => s + c.qty, 0)} item(s)`}
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Order type selector */}
        <div className="flex gap-1.5 mt-3">
          {['DineIn', 'WalkIn', 'Delivery'].map((type) => (
            <button
              key={type}
              onClick={() => onSetOrderType(type)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                orderType === type
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {type === 'DineIn' ? '🪑 Dine-In' : type === 'WalkIn' ? '🚶 Walk-In' : '🛵 Delivery'}
            </button>
          ))}
        </div>

        {/* Table selector (DineIn only) */}
        {orderType === 'DineIn' && (
          <select
            value={selectedTable?._id || ''}
            onChange={(e) => {
              const t = tables.find((t) => t._id === e.target.value) || null;
              onSelectTable(t);
            }}
            className="mt-2 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-gray-400 bg-white"
          >
            <option value="">— Select table —</option>
            {availableTables.map((t) => (
              <option key={t._id} value={t._id}>
                Table {t.tableNumber} · {t.section} · {t.capacity} seats
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {cart.length === 0 ? (
          <div className="py-12 text-center">
            <ChefHat size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-xs text-gray-400">Tap menu items to add them here</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item._id}
              item={item}
              onChangeQty={onChangeQty}
              onUpdateNote={onUpdateNote}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-3 border-t border-gray-200 bg-white space-y-3">
        {/* Customer name */}
        <input
          type="text"
          value={customerName}
          onChange={(e) => onSetCustomerName(e.target.value)}
          placeholder="Customer name (optional)"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-gray-400 transition-colors"
        />

        {/* Urgent toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => onSetIsUrgent(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs font-medium text-gray-600">
            🔴 Mark as Urgent
          </span>
        </label>

        {/* Subtotal */}
        {cart.length > 0 && (
          <div className="flex justify-between items-baseline border-t border-gray-100 pt-2">
            <span className="text-sm text-gray-500 font-medium">Subtotal</span>
            <span className="text-lg font-bold text-gray-900">Rs. {fmt(subtotal)}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={submitting || cart.length === 0 || (orderType === 'DineIn' && !selectedTable)}
          className="w-full py-3 rounded-xl text-sm font-bold bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending to Kitchen…
            </>
          ) : (
            <>
              <Send size={14} />
              Send to Kitchen
            </>
          )}
        </button>

        {orderType === 'DineIn' && !selectedTable && cart.length > 0 && (
          <p className="text-[10px] text-center text-amber-500">Select a table to continue</p>
        )}
      </div>
    </div>
  );
};

export default CartPanel;
