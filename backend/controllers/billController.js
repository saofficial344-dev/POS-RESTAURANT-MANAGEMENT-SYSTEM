import Bill from "../models/Bill.js";
import User from "../models/User.js";
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

// 🗑️ DELETE SINGLE BILL (Admin Only)
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findByIdAndDelete(id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill deleted successfully" });

  } catch (error) {
    console.log("DELETE BILL ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ DELETE ALL BILLS (Admin Only) — with password verification and date-range filtering
export const deleteAllBills = async (req, res) => {
  try {
    const { password, range } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    // Re-fetch admin user with password hash (req.user has it excluded)
    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin user not found." });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Delete operation cancelled." });
    }

    // Build date filter
    let filter = {};
    const now = new Date();

    if (range === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      filter = { createdAt: { $gte: startOfDay } };
    } else if (range === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);
      filter = { createdAt: { $gte: startOfWeek } };
    } else if (range === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filter = { createdAt: { $gte: startOfMonth } };
    }
    // range === "all" → filter stays {} → deletes everything

    const result = await Bill.deleteMany(filter);

    const rangeLabels = {
      today: "today's",
      week: "this week's",
      month: "this month's",
      all: "all",
    };

    res.json({
      message: `Successfully deleted ${result.deletedCount} ${rangeLabels[range] || "all"} bill(s).`,
    });

  } catch (error) {
    console.log("DELETE ALL BILLS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};