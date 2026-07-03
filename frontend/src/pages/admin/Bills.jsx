import { useContext, useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import { useBills } from "../../hooks/useBills";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import toast from "react-hot-toast";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";

const AdminBills = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";

  const { bills, loading, error, refetch: fetchBills } = useBills({ refreshInterval: 5_000 });

  const [filter, setFilter]   = useState("daily");

  const [cashTax, setCashTax]       = useState(0);
  const [cardTax, setCardTax]       = useState(0);
  const [serviceTax, setServiceTax] = useState(0);

  // Confirmation modal state: type = 'single' | 'all'
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    billId: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteRange, setDeleteRange] = useState("all");
  const [deletePassword, setDeletePassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fetchTax = async () => {
  try {

    const { data } =
      await API.get("/settings");

    setCashTax(data.cashTax || 0);
    setCardTax(data.cardTax || 0);
    setServiceTax(data.serviceTax || 0);

  } catch (error) {
    console.error(error);
  }
};

  useEffect(() => {
    fetchTax();
  }, []);

  // DATE FORMAT
  const formatDate = (date) => {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return {
        date: "--",
        time: "--",
      };
    }

    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString(),
    };
  };

  // FILTER BILLS
  const filteredBills = useMemo(() => {
    const now = new Date();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return bills
      .filter((bill) => {

        const billDate = new Date(bill.createdAt);

        if (filter === "daily") {
          return billDate >= startOfDay;
        }

        if (filter === "weekly") {
          return billDate >= startOfWeek;
        }

        if (filter === "monthly") {
          return billDate >= startOfMonth;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  }, [bills, filter]);

  // TOTAL SALES (WITHOUT VOID BILLS)
const totalSales = filteredBills
  .filter((bill) => bill.status !== "void")
  .reduce(
    (acc, bill) =>
      acc + Number(bill.totalAmount || 0),
    0
  );

  // TOTAL ORDERS
  const totalOrders = filteredBills.length;

  // TOTAL ITEMS — null-guard on bill.items prevents TypeError crashes
  const totalItems = filteredBills.reduce(
    (acc, bill) =>
      acc +
      (bill.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      ),
    0
  );

  // Open confirmation modal for single bill delete
  const openDeleteBill = (billId) => {
    setConfirmModal({ open: true, type: "single", billId });
  };

  // Open confirmation modal for delete all
  const openDeleteAll = () => {
    setDeletePassword("");
    setDeleteRange("all");
    setPasswordError("");
    setConfirmModal({ open: true, type: "all", billId: null });
  };

  // Close modal without action
  const closeModal = () => {
    setConfirmModal({ open: false, type: null, billId: null });
    setDeletePassword("");
    setDeleteRange("all");
    setPasswordError("");
  };

  // Execute the confirmed deletion
  const confirmDelete = async () => {
    if (confirmModal.type === "all") {
      if (!deletePassword.trim()) {
        setPasswordError("Password is required to confirm deletion.");
        return;
      }
    }

    setDeleteLoading(true);
    try {
      if (confirmModal.type === "single") {
        await API.delete(`/bills/${confirmModal.billId}`);
        toast.success("Bill deleted successfully");
      } else {
        const { data } = await API.delete("/bills/all", {
          data: { password: deletePassword, range: deleteRange },
        });
        toast.success(data.message || "Bills deleted successfully");
      }
      closeModal();
      fetchBills();
    } catch (error) {
      if (confirmModal.type === "all" && error.response?.status === 401) {
        setPasswordError(error.response.data.message || "Incorrect password. Delete operation cancelled.");
      } else {
        toast.error(error.response?.data?.message || "Failed to delete. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const saveTax = async () => {
  try {

   await API.put("/settings", {
      cashTax,
      cardTax,
      serviceTax,
    });

    alert("Tax Updated");

  } catch (error) {
    console.error(error);
  }
};

  // DOWNLOAD PDF
  const downloadPDF = () => {
    if (filteredBills.length === 0) {
      toast.error("No bills available to export");
      return;
    }

    try {
    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text(
      `${filter.toUpperCase()} SALES REPORT`,
      14,
      18
    );


  const tableData = [];

filteredBills.forEach((bill) => {

  let billStatus = "ACTIVE";

  if (bill.status === "void") {
    billStatus = "VOID";
  }

  if (bill.parentBillId) {
    billStatus = "REVISED";
  }

  tableData.push([
    bill.tableNo ?? "—",
    (bill.items || []).length,
    `Rs ${bill.totalAmount ?? 0}`,
    billStatus,
    formatDate(bill.createdAt).date,
    formatDate(bill.createdAt).time,
  ]);
});


autoTable(doc, {
  head: [
    [
      "Table",
      "Items",
      "Amount",
      "Status",
      "Date",
      "Time",
    ],
  ],

  body: tableData,

  startY: 28,

  styles: {
    fontSize: 10,
    cellPadding: 3,
  },

  headStyles: {
    fillColor: [0, 0, 0],
  },

  didParseCell: function (data) {

    // STATUS COLUMN
    if (
      data.section === "body" &&
      data.column.index === 3
    ) {

      const status =
        data.cell.raw;

      // VOID = RED
      if (status === "VOID") {

        data.cell.styles.fillColor =
          [255, 80, 80];

        data.cell.styles.textColor =
          [255, 255, 255];
      }

      // REVISED = GREEN
      if (status === "REVISED") {

        data.cell.styles.fillColor =
          [0, 170, 90];

        data.cell.styles.textColor =
          [255, 255, 255];
      }

    }

  },

});
    
   

    const finalY =
      doc.lastAutoTable?.finalY || 40;

    doc.setFontSize(12);

    doc.text(
      `Total Orders: ${totalOrders}`,
      14,
      finalY + 10
    );

    doc.text(
      `Items Sold: ${totalItems}`,
      14,
      finalY + 18
    );

    doc.text(
      `Total Revenue: Rs ${totalSales}`,
      14,
      finalY + 26
    );

    doc.save(`${filter}-sales-report.pdf`);
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  return (
  <div className="min-h-screen bg-[#eef1f5] p-4">

    {/* HEADER */}
    <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 py-4 mb-4">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* LEFT */}
        <div>

          <h1 className="text-[26px] font-medium tracking-tight text-gray-900">
          Bills Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Restaurant sales overview &
            analytics
          </p>

        </div>

        {/* RIGHT */}
        <div className="flex flex-wrap items-center gap-3">

          <div className="flex items-center gap-3">

            {/* TAX SECTION */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 shadow-sm">

              {/* CASH TAX */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Cash Tax
                </label>

                <input
                  type="number"
                  placeholder="%"
                  value={cashTax}
                  onChange={(e) =>
                    setCashTax(e.target.value)
                  }
                  className="h-[38px] w-[110px] px-3 border border-gray-300 bg-gray-50 text-sm font-semibold outline-none focus:border-black transition-all"
                />
              </div>

              {/* CARD TAX */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Card Tax
                </label>

                <input
                  type="number"
                  placeholder="%"
                  value={cardTax}
                  onChange={(e) =>
                    setCardTax(e.target.value)
                  }
                  className="h-[38px] w-[110px] px-3 border border-gray-300 bg-gray-50 text-sm font-semibold outline-none focus:border-black transition-all"
                />
              </div>

              {/* SERVICE TAX */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Service Tax
                </label>
              
                <input
                  type="number"
                  placeholder="%"
                  value={serviceTax}
                  onChange={(e) =>
                    setServiceTax(e.target.value)
                  }
                  className="h-[38px] w-[110px] px-3 border border-gray-300 bg-gray-50 text-sm font-semibold outline-none focus:border-black transition-all"
                />
              </div>

              {/* SAVE BUTTON */}
              <button
                onClick={saveTax}
                className="mt-[18px] h-[38px] px-5 bg-black text-white text-sm font-semibold border border-black hover:bg-white hover:text-black transition-all"
              >
                Save
              </button>

            </div>

            
       {/* FILTER + PDF */}
<div className="bg-white border border-gray-200 px-3 py-2 shadow-sm">

  <div className="flex items-end gap-3">

    {/* FILTER */}
    <div className="flex flex-col">
      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
        Income Filter
      </label>

      <select
        value={filter} 
        onChange={(e) =>
          setFilter(e.target.value)
        }
        className="h-[38px] w-[140px] px-4 border border-gray-300 bg-white text-sm font-semibold outline-none hover:border-black focus:border-black transition-all"
      >
        <option value="daily">
          Daily
        </option>

        <option value="weekly">
          Weekly
        </option>

        <option value="monthly">
          Monthly
        </option>

      </select>
    </div>

    {/* PDF BUTTON */}
    <button
      onClick={downloadPDF}
      className="h-[38px] px-5 bg-black text-white text-xs font-semibold border border-black hover:bg-white hover:text-black transition-all active:scale-[0.98]"
    >
      Download PDF
    </button>

    {/* DELETE ALL BILLS — Admin Only */}
    {isAdmin && (
      <button
        onClick={openDeleteAll}
        className="h-[38px] px-4 bg-red-600 text-white text-xs font-semibold border border-red-600 hover:bg-white hover:text-red-600 transition-all active:scale-[0.98] flex items-center gap-1.5"
      >
        <Trash2 size={13} />
        Delete All
      </button>
    )}

  </div>

</div>

          </div>

        </div>

      </div>

    </div>

    {/* STATS */}
     
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

      {/* REVENUE */}
      <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-800 text-white p-4 shadow-lg h-[120px]">

        <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 font-semibold">
          Total Revenue
        </p>

        <h2 className="text-[26px] font-normal mt-2 truncate">
          Rs {totalSales}
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-green-400 font-semibold">
            LIVE
          </span>

          <span className="text-[10px] text-gray-300">
            {filter.toUpperCase()}
          </span>

        </div>

      </div>

      {/* ORDERS */}
      <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

        <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-full -mr-6 -mt-6"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
          Total Orders
        </p>

        <h2 className="text-[26px] font-medium text-black mt-2">
          {totalOrders}
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-blue-600 font-semibold">
            ACTIVE SALES
          </span>
 
          <span className="w-2 h-2 bg-blue-600"></span>

        </div>

      </div>

      {/* ITEMS */}
      <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

        <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-full -mr-6 -mt-6"></div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
          Items Sold
        </p>

        <h2 className="text-[26px] font-medium text-black mt-2">
          {totalItems}
        </h2>

        <div className="mt-3 flex items-center justify-between">

          <span className="text-[10px] text-orange-600 font-semibold">
            QUANTITY SOLD
          </span>

          <span className="w-2 h-2 bg-orange-500"></span>

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
          onClick={fetchBills}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    )}

    {/* EMPTY */}
    {!loading && !error && filteredBills.length === 0 ? (

      <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">

        <h2 className="text-xl font-bold text-gray-800">
          No Bills Found
        </h2>

        <p className="text-sm text-gray-400 mt-2">
          No sales available for this
          filter
        </p>

      </div>

    ) : !loading && !error && (

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {filteredBills.map((bill) => (

          <div
            key={bill._id}
            className="bg-white border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >

            {/* HEADER */}
            <div className="border-b border-gray-200 px-3 py-2 bg-gradient-to-r from-[#fafafa] to-white shrink-0">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
                    Table
                  </p>

                  <h2 className="text-[16px] font-medium text-black mt-0.5">
                    # {bill.tableNo}
                  </h2>

                  {bill.status === "void" && (
  <span className="text-red-500 text-xs font-bold">
    VOID
  </span>
)}

{bill.parentBillId && (
  <span className="text-blue-500 text-xs font-bold">
    REVISED
  </span>
)}

                </div>

                <div className="text-right">

                  <p className="text-[10px] text-gray-500">
                    {formatDate(bill.createdAt).date}
                  </p>

                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {formatDate(bill.createdAt).time}
                  </p>

                </div>

              </div>

            </div>

            {/* BODY */}
            <div className="p-3 flex flex-col flex-1">

              {/* ITEMS */}
              <div className="max-h-[150px] overflow-y-auto pr-1 shrink-0">

                {bill.items?.map((item, index) => (

                  <div
                    key={index}
                    className="flex items-start justify-between"
                  >

                    <div className="min-w-0">

                      <h3 className="text-[12px] font-medium text-gray-800 truncate">
                        {item.name}
                      </h3>

                      <p className="text-[10px] text-gray-400">
                        Qty: {item.quantity}
                      </p>

                    </div>

                    <div className="text-right flex-shrink-0 ml-2">

                      <p className="text-[12px] font-semibold text-black">
                        Rs {item.price * item.quantity}
                      </p>

                    </div>

                  </div>

                ))}

              </div>

              {/* BILL SUMMARY + DELETE — mt-auto pins this block to the card bottom */}
              <div className="mt-auto">
              <div className="pt-3 border-t border-gray-200 mt-3">

                {/* SUBTOTAL */}
                <div className="flex items-center justify-between">

                  <p className="text-[11px] text-gray-500 font-medium">
                    Subtotal
                  </p>

                  <span className="text-[12px] font-medium text-black">
                    Rs {bill.subtotal?.toFixed(2)}
                  </span>

                </div>

                {/* TAX */}
                <div className="flex items-center justify-between">

                  <p className="text-[11px] text-gray-500 font-medium">
                    GST ({bill.taxPercentage}%)
                  </p>

                  <span className="text-[11px] font-medium text-black">
                    Rs {bill.taxAmount?.toFixed(2)}
                  </span>

                </div>
                {/* SERVICE TAX */}
                <div className="flex items-center justify-between">
                
                  <p className="text-[11px] text-gray-500 font-medium">
                    Service Tax ({bill.serviceTaxPercentage || 0}%)
                  </p>
                
                  <span className="text-[11px] font-medium text-black">
                    Rs {bill.serviceTaxAmount?.toFixed(2) || "0.00"}
                  </span>
                
                </div>

                {/* GRAND TOTAL */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">

                  <p className="text-[11px] font-semibold text-gray-700">
                    Grand Total
                  </p>

                  <span className="text-[18px] text-black font-medium">
                    Rs {bill.totalAmount?.toFixed(2)}
                  </span>

                </div>

              </div>

              {/* DELETE BILL BUTTON — Admin Only */}
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openDeleteBill(bill._id)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-[0.98]"
                  >
                    <Trash2 size={11} />
                    Delete Bill
                  </button>
                </div>
              )}
              </div>{/* end mt-auto wrapper */}

            </div>

          </div>
        ))}

      </div>

    )}

    {/* CONFIRMATION MODAL */}
    {confirmModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        />

        {/* Dialog */}
        <div className={`relative bg-white border border-gray-200 shadow-2xl w-full mx-4 ${confirmModal.type === "all" ? "max-w-md" : "max-w-sm"}`}>

          {/* Header */}
          <div className="bg-red-600 px-5 py-4">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-white" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {confirmModal.type === "all" ? "Delete Bills" : "Delete Bill"}
              </h3>
            </div>
          </div>

          {/* Body */}
          {confirmModal.type === "all" ? (
            <div className="px-5 py-5 space-y-4">

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">Warning</p>
                <p className="text-xs text-red-600 leading-relaxed">
                  This action cannot be undone. Deleted bills cannot be recovered.
                </p>
              </div>

              {/* Range Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Select Range
                </label>
                <div className="space-y-2">
                  {[
                    { value: "today", label: "Today" },
                    { value: "week", label: "This Week" },
                    { value: "month", label: "This Month" },
                    { value: "all", label: "All Bills" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="deleteRange"
                        value={opt.value}
                        checked={deleteRange === opt.value}
                        onChange={() => setDeleteRange(opt.value)}
                        className="accent-red-600 w-3.5 h-3.5"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
                  className={`w-full h-[38px] px-3 border bg-gray-50 text-sm outline-none transition-all ${
                    passwordError ? "border-red-500 focus:border-red-600" : "border-gray-300 focus:border-black"
                  }`}
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">{passwordError}</p>
                )}
              </div>

            </div>
          ) : (
            <div className="px-5 py-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Are you sure you want to delete this bill? This action cannot be undone.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-end gap-3">
            <button
              onClick={closeModal}
              disabled={deleteLoading}
              className="h-[36px] px-5 text-sm font-semibold text-gray-700 border border-gray-300 hover:border-gray-500 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="h-[36px] px-5 text-sm font-semibold text-white bg-red-600 border border-red-600 hover:bg-red-700 hover:border-red-700 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  {confirmModal.type === "all" ? "Delete" : "Delete"}
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    )}

  </div>
);
};

export default AdminBills;