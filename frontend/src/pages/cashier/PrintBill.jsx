import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../services/api";
import { useLocation, useNavigate } from "react-router-dom";

const PrintBill = () => {
  const { id } = useParams();

  const [bill, setBill] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      const { data } = await API.get(`/bills/${id}`);
      setBill(data);

      // AUTO PRINT
     setTimeout(() => {
  window.print();

  // 🔥 AFTER PRINT CLEAR MENU STATE
  if (location.state?.clearCart) {
    navigate("/cashier/menu", {
      replace: true,
      state: {},
    });
  }
}, 700);

    } catch (error) {
      console.log(error);
    }
  };

  if (!bill) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // TOTAL ITEMS
  const totalQty = bill.items.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  // DATE
  const date = new Date(
    bill.createdAt
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // TIME
  const time = new Date(
    bill.createdAt
  ).toLocaleTimeString();

  return (
    <>
      {/* PRINT STYLE */}
      <style>
        {`
        @media print {

  @page {
    size: 80mm auto;
    margin: 0;
  }

  body {
    margin: 0;
    padding: 0;
    background: white;
    -webkit-print-color-adjust: exact;
  }

  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 68mm;
    padding: 2mm;
    box-sizing: border-box;
    overflow: hidden;
  }

  * {
    word-break: break-word;
  }

  .no-print {
    display: none;
  }
}
        `}
      </style>

      <div className="bg-white flex justify-center py-2">

        {/* BILL */}
        <div className="print-area w-[250px] bg-white text-black p-1 font-mono">

          {/* HEADER */}
          <div className="text-center">

            <h1 className="text-[22px] font-bold leading-none tracking-tight">
              BAYROUTE
            </h1>

            <p className="text-[10px] mt-2 leading-4">
              Super market,F-6 markez Islamabad
              <br />
              Phone # 03366662441
            </p>

          </div>

          {/* DATE SECTION */}
          <div className="border border-black mt-3">

            {/* TOP */}
            <div className="grid grid-cols-3 text-[9px] border-b border-dashed border-black">

              <div className="p-1 border-r border-dashed border-black text-center">
                {date}
              </div>

              <div className="p-1 border-r border-dashed border-black text-center">
                {time}
              </div>

              <div className="p-1 text-center font-bold">
                POS
              </div>

            </div>

            {/* SECOND */}
            <div className="grid grid-cols-3 text-[9px] font-bold border-b border-black">

              <div className="p-1 border-r border-black text-center">
                Bill:
                {String(
                  bill._id.slice(-3)
                ).padStart(3, "0")}
              </div>

              <div className="p-1 border-r border-black text-center">
                Chq :
                {Math.floor(
                  100000 +
                  Math.random() * 900000
                )}
              </div>

              <div className="p-1 text-center">
                Table:
                {bill.tableNo}
              </div>

            </div>

            {/* TABLE HEAD */}
            <div className="grid grid-cols-4 border-b border-black text-[10px] font-bold">

              <div className="p-1 col-span-1">
                Item
              </div>

              <div className="p-1 text-center">
                Rate
              </div>

              <div className="p-1 text-center">
                Qty
              </div>

              <div className="p-1 text-right">
                Total
              </div>

            </div>

            {/* ITEMS */}
            <div className="min-h-[120px]">

              {bill.items.map(
                (item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 text-[9px]"
                  >

                    <div className="p-1 break-words font-bold">
                      {item.name}
                    </div>

                    <div className="p-1 text-center">
                      {item.price.toFixed(2)}
                    </div>

                    <div className="p-1 text-center">
                      {item.quantity}
                    </div>

                    <div className="p-1 text-right">
                      {(
                        item.price *
                        item.quantity
                      ).toFixed(2)}
                    </div>

                  </div>
                )
              )}

            </div>

          </div>

          {/* TOTAL */}
          <div className="mt-3">

            {/* SUBTOTAL */}
            <div className="flex justify-between text-[10px]">

              <span>Subtotal</span>

              <span>
                {bill.subtotal?.toFixed(2)}
              </span>

            </div>

            {/* TAX */}
            <div className="flex justify-between text-[10px] mt-1">

              <span>
                GST({bill.taxPercentage}%)
              </span>

              <span>
                {bill.taxAmount?.toFixed(2)}
              </span>

            </div>
            {/* SERVICE TAX */}
<div className="flex justify-between text-[10px] mt-1">

  <span>
    Service Tax({bill.serviceTaxPercentage || 0}%)
  </span>

  <span>
    {bill.serviceTaxAmount?.toFixed(2) || "0.00"}
  </span>

</div>

            {/* DISCOUNT */}
            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-[10px] mt-1">
                <span>
                  Discount
                  {bill.discountType === "percentage"
                    ? `(${bill.discountValue}%)`
                    : "(Fixed)"}
                </span>
                <span>
                  -{bill.discountAmount?.toFixed(2)}
                </span>
              </div>
            )}

            {/* TOTAL ITEMS */}
            <div className="flex justify-between text-[10px] mt-1">

              <span>Total Items</span>

              <span>{totalQty}</span>

            </div>

            {/* GRAND TOTAL */}
            <div className="flex justify-between items-center border-t border-black mt-2 pt-2">

              <h2 className="text-[16px] font-bold">
                TOTAL
              </h2>

              <h2 className="text-[18px] font-bold">
                Rs {(bill.grandTotal || bill.totalAmount)?.toFixed(2)}
              </h2>

            </div>

          </div>

          {/* FOOTER */}
          <div className="mt-3 text-center">

            <p className="text-[9px] uppercase leading-4">
              Thanks For Visit...
            </p>
 
            <p className="text-[8px] mt-2">
              Software Provided by @ShawhanaynLabs
            </p>

          </div>

        </div>

      </div>
    </>
  );
};

export default PrintBill;