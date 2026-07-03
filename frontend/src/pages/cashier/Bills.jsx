import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useBills } from "../../hooks/useBills";

const Bills = () => {
  const navigate = useNavigate();
  const { bills, loading, error, refetch } = useBills({ autoRefresh: true, refreshInterval: 30_000 });

  const handleEditAndReprint = async (bill) => {
    try {
      await API.put(`/bills/void/${bill._id}`);
      navigate("/pos/menu", { state: { editBill: bill } });
    } catch (err) {
      console.error(err);
    }
  };

  // useBills guarantees bills is always an array — .filter() is safe
  const filteredBills = bills.filter((bill) => {
    if (!bill.createdAt) return false;
    const diffInHours = (Date.now() - new Date(bill.createdAt).getTime()) / 3_600_000;
    return diffInHours <= 24;
  });

  const sorted = [...filteredBills].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="min-h-screen bg-[#eef1f5] p-4">

      {/* HEADER */}
      <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-black tracking-tight text-black">Cashier Bills</h1>
            <p className="text-sm text-gray-500 mt-1">Generated receipts history · last 24 hours</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-sm">
              {bills.length}
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

        <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-800 text-white p-4 shadow-lg h-[120px]">
          <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 font-semibold">Total Bills</p>
          <h2 className="text-[26px] font-medium mt-2">{bills.length}</h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-green-400 font-semibold">ACTIVE</span>
            <span className="text-[10px] text-gray-300">CASHIER</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">Last 24 Hours</p>
          <h2 className="text-[26px] font-normal text-black mt-2">{filteredBills.length}</h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-blue-600 font-semibold">RECEIPTS</span>
            <span className="w-2 h-2 bg-blue-600" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">Status</p>
          <h2 className="text-[26px] font-normal text-black mt-2">Running</h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-orange-600 font-semibold">LIVE DATABASE</span>
            <span className="w-2 h-2 bg-orange-500" />
          </div>
        </div>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">
          <RefreshCw size={28} className="animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading bills…</p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="bg-white border border-red-200 shadow-sm p-10 text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">Failed to Load Bills</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* EMPTY */}
      {!loading && !error && filteredBills.length === 0 && (
        <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">
          <h2 className="text-xl font-bold text-gray-800">No Bills Found</h2>
          <p className="text-sm text-gray-400 mt-2">No receipts generated in the last 24 hours</p>
        </div>
      )}

      {/* BILLS GRID */}
      {!loading && !error && sorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sorted.map((bill, index) => (
            <div
              key={bill._id}
              className="bg-white border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >

              {/* CARD HEADER */}
              <div className="border-b border-gray-200 px-3 py-2 bg-gradient-to-r from-[#fafafa] to-white shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-semibold">Table</p>
                    <h2 className="text-[16px] font-medium text-black"># {bill.tableNo}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-3 flex flex-col flex-1">

                {/* ITEMS — null-safe: bill.items may be undefined on legacy bills */}
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1 shrink-0">
                  {(bill.items || []).map((item, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="text-[12px] font-medium text-gray-800 truncate">{item.name}</h3>
                        <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[12px] font-semibold text-black">
                          Rs {item.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TOTALS — mt-auto pins to card bottom */}
                <div className="mt-auto pt-3 border-t border-gray-200">

                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-gray-500 font-medium">Subtotal</p>
                    <span className="text-[11px] font-semibold text-black">Rs {bill.subtotal?.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-gray-500 font-medium">GST ({bill.taxPercentage}%)</p>
                    <span className="text-[11px] font-medium text-black">Rs {bill.taxAmount?.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-gray-500 font-medium">
                      Service Tax ({bill.serviceTaxPercentage || 0}%)
                    </p>
                    <span className="text-[11px] font-medium text-black">
                      Rs {bill.serviceTaxAmount?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {bill.discountAmount > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-green-600 font-medium">
                        Discount{" "}
                        {bill.discountType === "percentage"
                          ? `(${bill.discountValue}%)`
                          : "(Fixed)"}
                      </p>
                      <span className="text-[11px] font-medium text-green-600">
                        - Rs {bill.discountAmount?.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-700">Grand Total</p>
                    <span className="text-[18px] font-medium text-black">
                      Rs {(bill.grandTotal || bill.totalAmount)?.toFixed(2)}
                    </span>
                  </div>

                  {index < 8 && bill.status !== "void" && !bill.parentBillId && (
                    <button
                      onClick={() => handleEditAndReprint(bill)}
                      className="w-full mt-3 h-[34px] bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all"
                    >
                      Edit &amp; Reprint
                    </button>
                  )}

                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Bills;
