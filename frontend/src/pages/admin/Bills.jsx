import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdminBills = () => {
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("daily");

  const [cashTax, setCashTax] = useState(0);
  const [cardTax, setCardTax] =useState(0);
  const [serviceTax, setServiceTax] = useState(0);

  // FETCH BILLS
  const fetchBills = async () => {
    try {
      const { data } = await API.get("/bills");
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTax = async () => {
  try {

    const { data } =
      await API.get("/settings");

    setCashTax(data.cashTax || 0);
    setCardTax(data.cardTax || 0);
    setServiceTax(data.serviceTax || 0);

  } catch (error) {
    console.log(error);
  }
};

  useEffect(() => {
    fetchBills()
    fetchTax();

    const interval = setInterval(fetchBills, 5000);

    return () => clearInterval(interval);
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

  // TOTAL ITEMS
  const totalItems = filteredBills.reduce(
    (acc, bill) =>
      acc +
      bill.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      ),
    0
  );

  const saveTax = async () => {
  try {

   await API.put("/settings", {
      cashTax,
      cardTax,
      serviceTax,
    });

    alert("Tax Updated");

  } catch (error) {
    console.log(error);
  }
};

  // DOWNLOAD PDF
  const downloadPDF = () => {
    if (filteredBills.length === 0) {
      alert("No bills available");
      return;
    }

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
    bill.tableNo,
    bill.items.length,
    `Rs ${bill.totalAmount}`,
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
            +12.4%
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

    {/* EMPTY */}
    {filteredBills.length === 0 ? (

      <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">

        <h2 className="text-xl font-bold text-gray-800">
          No Bills Found
        </h2>

        <p className="text-sm text-gray-400 mt-2">
          No sales available for this
          filter
        </p>

      </div>

    ) : (

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {filteredBills.map((bill) => (

          <div
            key={bill._id}
            className="bg-white border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >

            {/* HEADER */}
            <div className="border-b border-gray-200 px-3 py-2 bg-gradient-to-r from-[#fafafa] to-white">

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
            <div className="p-3">

              {/* ITEMS */}
              <div className="max-h-[150px] overflow-y-auto pr-1">

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

              {/* BILL SUMMARY */}
              <div className="mt-3 pt-3 border-t border-gray-200 ">

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

            </div>

          </div>
        ))}

      </div>

    )}

  </div>
);
};

export default AdminBills;