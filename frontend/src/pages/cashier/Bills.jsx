import { useEffect, useState } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";

const Bills = () => {
  const [bills, setBills] = useState([]);
  const navigate = useNavigate();
  
  const handleEditAndReprint = async (bill) => {
  try {
    // 1. VOID OLD BILL
    await API.put(`/bills/void/${bill._id}`);

    // 2. SEND DATA TO MENU FOR EDIT
    navigate("/pos/menu", {
      state: { editBill: bill },
    });

  } catch (error) {
    console.log(error);
  }
};

  const fetchBills = async () => {
    try {
      const { data } = await API.get("/bills");
      setBills(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchBills();

    // auto refresh every 30 sec (optional but useful)
    const interval = setInterval(fetchBills, 30000);

    return () => clearInterval(interval);
  }, []);

  // ✅ 24 HOURS FILTER LOGIC (IMPORTANT PART)
  const filteredBills = bills.filter((bill) => {
    if (!bill.createdAt) return false;

    const billTime = new Date(bill.createdAt).getTime();
    const now = new Date().getTime();

    const diffInHours = (now - billTime) / (1000 * 60 * 60);

    return diffInHours <= 24; // only show last 24 hours
  });

 return (
  <div className="min-h-screen bg-[#eef1f5] p-4">

    {/* HEADER */}
    <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-[26px] font-black tracking-tight text-black">
            Cashier Bills
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Generated receipts history
          </p>

        </div>

        <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-sm">

          {bills.length}

        </div>

      </div>

    </div>

    {/* STATS */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

      {/* TOTAL BILLS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-800 text-white p-4 shadow-lg h-[120px]">

        <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 font-semibold">
          Total Bills
        </p>

        <h2 className="text-[26px] font-medium mt-2">
          {bills.length}
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-green-400 font-semibold">
            ACTIVE
          </span>

          <span className="text-[10px] text-gray-300">
            CASHIER
          </span>

        </div>

      </div>

      {/* HISTORY */}
      <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

        <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-full -mr-6 -mt-6"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
          History
        </p>

        <h2 className="text-[26px] font-normal text-black mt-2">
          Bills
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-blue-600 font-semibold">
            RECEIPTS
          </span>

          <span className="w-2 h-2 bg-blue-600"></span>

        </div>

      </div>

      {/* SYSTEM */}
      <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

        <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-full -mr-6 -mt-6"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
          Status
        </p>

        <h2 className="text-[26px] font-normal text-black mt-2">
          Running
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-orange-600 font-semibold">
            LIVE DATABASE
          </span>

          <span className="w-2 h-2 bg-orange-500"></span>

        </div>

      </div>

    </div>

    {/* EMPTY */}
    {bills.length === 0 ? (

      <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">

        <h2 className="text-xl font-bold text-gray-800">
          No Bills Found
        </h2>

        <p className="text-sm text-gray-400 mt-2">
          No receipts generated yet
        </p>

      </div>

    ) : (

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

       {[...bills]
  .sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  )
  .map((bill, index) => (
            <div
              key={bill._id}
              className="bg-white border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >

              {/* CARD HEADER */}
             {/* HEADER */}
<div className="border-b border-gray-200 px-3 py-2 bg-gradient-to-r from-[#fafafa] to-white shrink-0">

  <div className="flex items-start justify-between">

    {/* LEFT */}
    <div>

      <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
        Table
      </p>

      <h2 className="text-[16px] font-medium text-black ">
        # {bill.tableNo}
      </h2>

    </div>

    {/* RIGHT */}
    <div className="text-right">

      <p className="text-[10px] text-gray-500">
        {new Date(bill.createdAt).toLocaleDateString()}
      </p>

      <p className="text-[9px] text-gray-400 mt-0.5">
        {new Date(bill.createdAt).toLocaleTimeString()}
      </p>

    </div>

  </div>

</div>

{/* BODY */}
<div className="p-3 flex flex-col flex-1">

  {/* ITEMS */}
  <div className="space-y- max-h-[150px] overflow-y-auto pr-1 shrink-0">

    {bill.items.map((item, index) => (

      <div
        key={index}
        className="flex items-start justify-between pb-"
      >

        {/* LEFT */}
        <div className="min-w-0">

          <h3 className="text-[12px] font-medium text-gray-800 truncate">
            {item.name}
          </h3>

          <p className="text-[10px] text-gray-400">
            Qty: {item.quantity}
          </p>

        </div>

        {/* RIGHT */}
        <div className="text-right flex-shrink-0 ml-2">

          <p className="text-[12px] font-semibold text-black">
            Rs {item.price * item.quantity}
          </p>

        </div>

      </div>

    ))}

  </div>

  {/* TOTAL — mt-auto pins this section to the bottom of the card */}
  <div className="mt-auto pt-3 border-t border-gray-200">

  <div className="flex items-center justify-between mb-">

    <p className="text-[11px] text-gray-500 font-medium">
      Subtotal
    </p>

    <span className="text-[11px] font-semibold text-black">
      Rs {bill.subtotal?.toFixed(2)}
    </span>

  </div>


  <div className="flex items-center justify-between mb-2">

    <p className="text-[11px] text-gray-500 font-medium">
      GST ({bill.taxPercentage}%)
    </p>

    <span className="text-[11px] font-medium text-black">
      Rs {bill.taxAmount?.toFixed(2)}
    </span>

  </div>
  {/* SERVICE TAX */}
<div className="flex items-center justify-between mb-2">

  <p className="text-[11px] text-gray-500 font-medium">
    Service Tax ({bill.serviceTaxPercentage || 0}%)
  </p>

  <span className="text-[11px] font-medium text-black">
    Rs {bill.serviceTaxAmount?.toFixed(2) || "0.00"}
  </span>

</div>

  {/* DISCOUNT */}
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

    <div>

      <p className="text-[11px] font-semibold text-gray-700">
        Grand Total
      </p>



    </div>

    <div className="flex items-center gap-3">

      <span className="text-[18px] font-medium text-black">
        Rs {(bill.grandTotal || bill.totalAmount)?.toFixed(2)}
      </span>



    </div>

  </div>

  {index < 8 &&
 bill.status !== "void" &&
 !bill.parentBillId && (

  <button
    onClick={() => handleEditAndReprint(bill)}
    className="w-full mt-3 h-[34px] bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all"
  >
    Edit & Reprint
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