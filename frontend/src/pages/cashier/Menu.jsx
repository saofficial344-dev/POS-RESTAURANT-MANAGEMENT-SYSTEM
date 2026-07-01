import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../services/api";
import toast from "react-hot-toast";
import SearchBar     from "../../components/pos/SearchBar";
import CategoryFilter from "../../components/pos/CategoryFilter";
import MenuGrid       from "../../components/pos/MenuGrid";

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [tableNo, setTableNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashTax, setCashTax] = useState(0);
  const [cardTax, setCardTax] = useState(0);
  const [serviceTax, setServiceTax] = useState(0);
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const editBill = location.state?.editBill;

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, itemRes, taxRes] = await Promise.all([
          API.get("/categories"),
          API.get("/items"),
          API.get("/settings"),
        ]);
        setCategories(catRes.data || []);
        setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
        setCashTax(taxRes.data.cashTax || 0);
        setCardTax(taxRes.data.cardTax || 0);
        setServiceTax(taxRes.data.serviceTax || 0);
      } catch (err) {
        console.error("Menu load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (editBill) {
      setCart(editBill.items);
      setTableNo(editBill.tableNo);
      toast.success("Editing previous bill");
    }
  }, [editBill]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (search.trim()) return item.name.toLowerCase().includes(search.toLowerCase());
    if (selectedCategory !== "all") return String(item.category) === String(selectedCategory);
    return true;
  });

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c._id === item._id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const decreaseQty = (id) => {
    setCart((prev) =>
      prev
        .map((c) => (c._id === id ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const getCartQty = (id) => cart.find((c) => c._id === id)?.quantity || 0;

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const appliedTax = paymentMethod === "Cash" ? cashTax : cardTax;
  const taxAmount = (subtotal * Number(appliedTax)) / 100;
  const serviceTaxAmount = (subtotal * Number(serviceTax)) / 100;
  const total = subtotal + taxAmount + serviceTaxAmount;
  const grandTotal = total - discountAmount;

  // ── Discount ──────────────────────────────────────────────────────────────
  const applyDiscount = () => {
    if (!discountType) { toast.error("Select a discount type"); return; }
    if (!discountValue || isNaN(discountValue)) { toast.error("Enter a valid discount value"); return; }
    const value = Number(discountValue);
    if (value < 0) { toast.error("Discount cannot be negative"); return; }
    if (discountType === "percentage" && value > 100) { toast.error("Percentage cannot exceed 100%"); return; }
    if (discountType === "fixed" && value > total) { toast.error("Discount cannot exceed total amount"); return; }
    setDiscountAmount(discountType === "percentage" ? (total * value) / 100 : value);
    toast.success("Discount applied!");
  };

  const removeDiscount = () => {
    setDiscountType(""); setDiscountValue(""); setDiscountAmount(0);
  };

  // ── Bill generation ───────────────────────────────────────────────────────
  const generateBill = async () => {
    if (!tableNo) { toast.error("Table number is required"); return; }
    if (cart.length === 0) { toast.error("Add at least 1 item"); return; }

    const payload = {
      tableNo: Number(tableNo),
      items: cart,
      subtotal,
      taxPercentage: appliedTax,
      taxAmount,
      serviceTaxPercentage: serviceTax,
      serviceTaxAmount,
      paymentMethod,
      totalAmount: total,
      discountType: discountType || null,
      discountValue: discountType ? Number(discountValue) : 0,
      ...(editBill ? { parentBillId: editBill._id, version: (editBill.version || 1) + 1, status: "active" } : {}),
    };

    try {
      const res = await API.post("/bills", payload);
      toast.success("Bill Generated Successfully");
      navigate(`/pos/print/${res.data._id}`, { state: { clearCart: true } });
      setCart([]);
      setTableNo("");
      setDiscountType(""); setDiscountValue(""); setDiscountAmount(0);
    } catch (err) {
      console.error(err);
      toast.error("Bill generation failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#eef1f5] p-4 flex gap-4">

      {/* ── LEFT: Menu ── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-black">POS Menu</h1>
              <p className="text-sm text-gray-500 mt-1">Select category and manage orders</p>
            </div>
            <div className="w-full md:w-[280px]">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); if (v) setSelectedCategory("all"); }}
                placeholder="Search item…"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border border-gray-200 shadow-sm p-4 mb-4">
          <CategoryFilter
            categories={categories}
            activeId={selectedCategory}
            onSelect={(id) => { setSelectedCategory(id); setSearch(""); }}
          />
        </div>

        {/* Items grid */}
        <div className="bg-white border border-gray-200 shadow-sm p-4">
          <MenuGrid
            items={filteredItems}
            onAdd={addToCart}
            getCartQty={getCartQty}
            loading={loading}
            cols="3"
          />
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
      <div className="w-[32%] bg-white border border-gray-200 shadow-sm p-5 h-fit sticky top-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[22px] font-black text-black">Cart Summary</h2>
            <p className="text-xs text-gray-400 mt-1">{cart.length} items added</p>
          </div>
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center text-sm font-bold">
            {cart.length}
          </div>
        </div>

        {/* Table + Payment */}
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            placeholder="Table No"
            className="w-1/2 h-[38px] px-3 border border-gray-300 bg-white text-xs font-medium outline-none hover:border-black focus:border-black transition-all"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-1/2 h-[38px] px-1 border border-gray-300 bg-white text-xs font-medium outline-none hover:border-black focus:border-black transition-all"
          >
            <option value="Cash">💵 Cash Payment</option>
            <option value="Card">💳 Card Payment</option>
          </select>
        </div>

        {/* Cart items */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No items in cart</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item._id} className="border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-black">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">Rs {item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decreaseQty(item._id)}
                      className="w-7 h-7 border border-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                    >−</button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-7 h-7 border border-gray-300 hover:bg-black hover:text-white hover:border-black transition-all"
                    >+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="text-sm font-semibold">Rs {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">GST ({appliedTax}%)</span>
            <span className="text-sm font-semibold">Rs {taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Service Tax ({serviceTax}%)</span>
            <span className="text-sm font-semibold">Rs {serviceTaxAmount.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">
                Discount {discountType === "percentage" ? `(${discountValue}%)` : "(Fixed)"}
              </span>
              <span className="text-sm font-semibold">- Rs {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-500">Grand Total</span>
            <span className="text-[26px] font-medium text-black">Rs {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Discount section */}
        <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-2">
            Apply Discount
          </p>
          <div className="flex gap-2 mb-2">
            <select
              value={discountType}
              onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(""); setDiscountAmount(0); }}
              className="w-1/2 h-[36px] px-2 border border-gray-300 bg-white text-xs font-medium outline-none hover:border-black focus:border-black transition-all"
            >
              <option value="">Type</option>
              <option value="percentage">% Percentage</option>
              <option value="fixed">Rs Fixed</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder={discountType === "percentage" ? "0 – 100" : "Amount"}
              value={discountValue}
              onChange={(e) => { setDiscountValue(e.target.value); if (discountAmount > 0) setDiscountAmount(0); }}
              disabled={!discountType}
              className="w-1/2 h-[36px] px-3 border border-gray-300 bg-white text-xs font-medium outline-none hover:border-black focus:border-black transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyDiscount}
              disabled={!discountType || !discountValue}
              className="flex-1 h-[32px] bg-gray-900 text-white text-[11px] font-semibold hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            {discountAmount > 0 && (
              <button
                onClick={removeDiscount}
                className="flex-1 h-[32px] border border-red-400 text-red-500 text-[11px] font-semibold hover:bg-red-500 hover:text-white transition-all"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Generate bill */}
        <button
          onClick={generateBill}
          className="w-full h-[44px] mt-5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all"
        >
          Generate Bill
        </button>
      </div>
    </div>
  );
};

export default Menu;
