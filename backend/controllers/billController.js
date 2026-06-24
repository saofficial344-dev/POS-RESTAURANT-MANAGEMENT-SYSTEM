import Bill from "../models/Bill.js";
import {
  validateDiscount,
  calculateDiscountAmount,
  calculateGrandTotal,
} from "../utils/discountHelper.js";


// 🧾 CREATE BILL
export const createBill = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

 const {
  tableNo,
  items,
  subtotal,
  taxPercentage,
  taxAmount,
  serviceTaxPercentage,
  serviceTaxAmount,
  totalAmount,
  paymentMethod,
  parentBillId,
  version,
  discountType,
  discountValue,
} = req.body;

  // DISCOUNT CALCULATION
  const validation = validateDiscount(discountType, discountValue, totalAmount);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  const discountAmount = calculateDiscountAmount(discountType, discountValue, totalAmount);
  const grandTotal = calculateGrandTotal(totalAmount, discountAmount);

  const bill = await Bill.create({
  tableNo,
  items,
  subtotal,
  taxPercentage,
  taxAmount,
  serviceTaxPercentage,
  serviceTaxAmount,
  totalAmount,
  discountType: discountType || undefined,
  discountValue: Number(discountValue) || 0,
  discountAmount,
  grandTotal,
  paymentMethod,
  parentBillId: parentBillId || null,
  version: version || 1,
  status: "active",
  createdBy: req.user?._id || null,
});

    res.status(201).json(bill);
  } catch (error) {
    console.log("CREATE BILL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📄 GET ALL BILLS
export const getBills = async (req, res) => {
  const bills = await Bill.find().sort({ createdAt: -1 }); 
  res.json(bills);
};
// 📄 GET SINGLE BILL
export const getSingleBill = async (req, res) => {
  try {
    const bill = await Bill.findById(
      req.params.id
    );

    res.json(bill);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};
// 🧾 VOID BILL
export const voidBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    bill.status = "void";
    await bill.save();

    res.json({ message: "Bill voided successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};