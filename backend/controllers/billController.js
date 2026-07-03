import Bill  from '../models/Bill.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import User  from '../models/User.js';
import {
  validateDiscount,
  calculateDiscountAmount,
  calculateGrandTotal,
} from '../utils/discountHelper.js';
import {
  emitToCashiers,
  emitToManagers,
  emitToWaiters,
  emitToRestaurant,
} from '../socket/index.js';
import { createAndEmit } from './notificationController.js';

// Helper — build the base tenant filter
const tf = (req) => ({ restaurantId: req.restaurantId || null });

// CREATE BILL
export const createBill = async (req, res) => {
  try {
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

    const validation = validateDiscount(discountType, discountValue, totalAmount);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const discountAmount = calculateDiscountAmount(discountType, discountValue, totalAmount);
    const grandTotal     = calculateGrandTotal(totalAmount, discountAmount);

    const bill = await Bill.create({
      ...tf(req),
      tableNo,
      items,
      subtotal,
      taxPercentage,
      taxAmount,
      serviceTaxPercentage,
      serviceTaxAmount,
      totalAmount,
      discountType:   discountType || undefined,
      discountValue:  Number(discountValue) || 0,
      discountAmount,
      grandTotal,
      paymentMethod,
      parentBillId:   parentBillId || null,
      version:        version      || 1,
      status:         'active',
      createdBy:      req.user?._id || null,
    });

    // Real-time: bill created from POS (direct, not via completeOrder)
    const rid = req.restaurantId;
    emitToCashiers(rid, 'bill:created', { billId: bill._id, grandTotal: bill.grandTotal, tableNo: bill.tableNo, paymentMethod: bill.paymentMethod, at: new Date() });
    emitToManagers(rid, 'bill:created', { billId: bill._id, grandTotal: bill.grandTotal, at: new Date() });

    res.status(201).json(bill);
  } catch (error) {
    console.log('CREATE BILL ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET ALL BILLS — paginated
export const getBills = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentMethod } = req.query;
    const skip   = (Number(page) - 1) * Number(limit);
    const filter = tf(req);

    if (status)        filter.status        = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const [bills, total] = await Promise.all([
      Bill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Bill.countDocuments(filter),
    ]);

    res.json({
      data:  bills,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE BILL
export const getSingleBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, ...tf(req) });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VOID BILL
export const voidBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, ...tf(req) });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    bill.status = 'void';
    await bill.save();
    res.json({ message: 'Bill voided successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE SINGLE BILL (Admin Only)
export const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, ...tf(req) });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PAY BILL — PATCH /bills/:id/pay
// Called by cashier to record payment on an existing bill (generated via completeOrder)
// OR to create-and-pay a bill for a Served order in one step.
export const payBill = async (req, res) => {
  try {
    const { paymentMethod = 'Cash', transactionReference, discountType, discountValue, amountPaid } = req.body;
    const rid = req.restaurantId;

    let bill = await Bill.findOne({ _id: req.params.id, ...tf(req) })
      .populate('orderId', 'tableNumber orderType customerName waiterId orderNumber status servedAt readyAt totalAmount subtotal taxAmount items');

    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (bill.status === 'void')          return res.status(400).json({ message: 'Cannot pay a voided bill' });
    if (bill.paymentStatus === 'paid')   return res.status(400).json({ message: 'Bill already paid' });

    const now = new Date();

    // Recompute discount + grand total if cashier applies a discount
    if (discountType && discountValue) {
      const validation = validateDiscount(discountType, discountValue, bill.totalAmount);
      if (!validation.valid) return res.status(400).json({ message: validation.error });
      bill.discountType   = discountType;
      bill.discountValue  = Number(discountValue);
      bill.discountAmount = calculateDiscountAmount(discountType, discountValue, bill.totalAmount);
      bill.grandTotal     = calculateGrandTotal(bill.totalAmount, bill.discountAmount);
    }

    bill.paymentStatus        = 'paid';
    bill.paymentMethod        = paymentMethod;
    bill.transactionReference = transactionReference || null;
    bill.paidAt               = now;
    bill.paidBy               = req.user._id;
    bill.paidByName           = req.user.name;
    await bill.save();

    // Update linked order to Completed
    const order = bill.orderId;
    if (order && order.status !== 'Completed') {
      const paid    = amountPaid || bill.grandTotal;
      order.status        = 'Completed';
      order.completedAt   = now;
      order.completedBy   = req.user._id;
      order.paymentMethod = paymentMethod;
      order.amountPaid    = paid;
      order.changeAmount  = Math.max(0, paid - bill.grandTotal);
      order.paymentStatus = paid >= bill.grandTotal ? 'Paid' : 'Partial';
      order.billId        = bill._id;
      order.timeline.push({ status: 'Completed', by: req.user._id, byName: req.user.name, at: now });
      await order.save();

      // Free the table
      if (order.tableNumber && order.orderType === 'DineIn') {
        const table = await Table.findOne({ tableNumber: order.tableNumber, restaurantId: rid });
        if (table) {
          table.status         = 'Available';
          table.currentOrderId = null;
          table.occupiedBy     = null;
          table.needsCleaning  = true;
          await table.save();
          emitToWaiters(rid,    'table:available',      { tableId: table._id, tableNumber: table.tableNumber, at: now });
          emitToManagers(rid,   'table:available',      { tableId: table._id, tableNumber: table.tableNumber, at: now });
          emitToRestaurant(rid, 'table:status:changed', { tableId: table._id, tableNumber: table.tableNumber, status: 'Available', at: now });
        }
      }

      emitToRestaurant(rid, 'order:status:changed', {
        orderId: order._id, orderNumber: order.orderNumber,
        status: 'Completed', tableNumber: order.tableNumber, at: now,
      });
    }

    // Emit bill:paid to all relevant rooms
    const paidPayload = {
      billId: bill._id, orderId: bill.orderId?._id, orderNumber: bill.orderNumber,
      grandTotal: bill.grandTotal, tableNo: bill.tableNo,
      paymentMethod: bill.paymentMethod, at: now,
    };
    emitToCashiers(rid,   'bill:paid', paidPayload);
    emitToManagers(rid,   'bill:paid', paidPayload);

    createAndEmit({
      restaurantId: rid, role: 'manager',
      type: 'bill:paid',
      title: `Payment Received — Table T-${bill.tableNo || '?'}`,
      message: `${bill.orderNumber} · Rs ${Math.round(bill.grandTotal).toLocaleString()} via ${paymentMethod}`,
      data: { billId: bill._id, orderNumber: bill.orderNumber, grandTotal: bill.grandTotal, tableNumber: bill.tableNo },
      priority: 'normal',
    });

    res.json({ success: true, message: 'Payment recorded successfully', data: bill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET UNPAID BILLS — cashier queue
export const getUnpaidBills = async (req, res) => {
  try {
    const bills = await Bill.find({ ...tf(req), paymentStatus: 'unpaid', status: 'active' })
      .populate('orderId', 'status servedAt readyAt orderNumber customerName tableNumber orderType items waiterId')
      .populate('waiterId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE ALL BILLS (Admin Only) — with password verification and date-range filtering
export const deleteAllBills = async (req, res) => {
  try {
    const { password, range } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    // Re-fetch admin with password hash (excluded by default via select: false)
    const admin = await User.findById(req.user._id).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: 'Incorrect password. Delete operation cancelled.' });
    }

    const now = new Date();
    let dateFilter = {};

    if (range === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: s } };
    } else if (range === 'week') {
      const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: s } };
    } else if (range === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: s } };
    }

    const result = await Bill.deleteMany({ ...tf(req), ...dateFilter });

    const labels = { today: "today's", week: "this week's", month: "this month's", all: 'all' };
    res.json({
      message: `Successfully deleted ${result.deletedCount} ${labels[range] || 'all'} bill(s).`,
    });
  } catch (error) {
    console.log('DELETE ALL BILLS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};
