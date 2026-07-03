import Order from '../models/Order.js';
import Item  from '../models/Item.js';
import Bill  from '../models/Bill.js';
import Table from '../models/Table.js';
import {
  emitToKitchen,
  emitToWaiters,
  emitToCashiers,
  emitToManagers,
  emitToRestaurant,
} from '../socket/index.js';
import { createAndEmit } from './notificationController.js';

const populateOrder = (query) =>
  query
    .populate('createdBy',      'name role')
    .populate('waiterId',       'name role')
    .populate('kitchenStaffId', 'name role')
    .populate('deliveryRiderId','name role')
    .populate('completedBy',    'name role')
    .populate('cancelledBy',    'name role')
    .populate('readyBy',        'name role')
    .populate('servedBy',       'name role');

const tf = (req) => ({ restaurantId: req.restaurantId || null });

// ── Allowed transitions per role ──────────────────────────────────────────────
const ROLE_ALLOWED_TRANSITIONS = {
  kitchen:  ['Cooking', 'Ready'],
  waiter:   ['Served'],
  cashier:  ['Completed'],
  manager:  ['Cooking', 'Ready', 'Served', 'Completed', 'Cancelled'],
  admin:    ['Cooking', 'Ready', 'Served', 'Completed', 'Cancelled'],
  delivery: ['Completed'],
};

// ── POST /api/orders ──────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const {
      orderType, tableNumber, numberOfGuests, customerName,
      customerPhone, items, notes, deliveryAddress, isUrgent,
    } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Please provide at least one item' });

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbItem = await Item.findOne({ _id: item.itemId, ...tf(req) });
      if (!dbItem)
        return res.status(404).json({ success: false, message: `Item not found: ${item.itemId}` });
      subtotal += dbItem.price * item.quantity;
      validatedItems.push({
        itemId: dbItem._id, itemName: dbItem.name,
        quantity: item.quantity, price: dbItem.price,
        specialInstructions: item.specialInstructions || '', status: 'Pending',
      });
    }

    const deliveryCharge = orderType === 'Delivery' ? 100 : 0;
    const totalAmount    = subtotal + deliveryCharge;

    const order = await Order.create({
      ...tf(req),
      orderType:      orderType || 'WalkIn',
      tableNumber:    orderType === 'DineIn' ? tableNumber : null,
      numberOfGuests: numberOfGuests || 1,
      customerName:   customerName || 'Walk-in Customer',
      customerPhone:  customerPhone || null,
      items:          validatedItems,
      subtotal, deliveryCharge, totalAmount,
      createdBy: req.user._id,
      waiterId:  req.user.role === 'waiter' ? req.user._id : null,
      notes,
      deliveryAddress: orderType === 'Delivery' ? deliveryAddress : null,
      isUrgent: isUrgent || false,
      status:   'Pending',
      timeline: [{ status: 'Pending', by: req.user._id, byName: req.user.name, at: new Date() }],
    });

    // Auto-occupy table for DineIn
    if (orderType === 'DineIn' && tableNumber) {
      const table = await Table.findOne({ tableNumber, ...tf(req) });
      if (table && table.status === 'Available') {
        table.status         = 'Occupied';
        table.currentOrderId = order._id;
        table.occupiedBy     = { numberOfGuests: numberOfGuests || 1, customerName: customerName || '', checkinTime: new Date() };
        await table.save();
      }
    }

    const populated = await populateOrder(Order.findById(order._id));

    const rid          = req.restaurantId;
    const orderPayload = {
      orderId: order._id, orderNumber: order.orderNumber,
      tableNumber: order.tableNumber, orderType: order.orderType,
      isUrgent: order.isUrgent, itemCount: order.items.length, at: new Date(),
    };
    emitToKitchen(rid, 'order:created', orderPayload);
    emitToManagers(rid, 'order:created', orderPayload);

    createAndEmit({
      restaurantId: rid, role: 'kitchen', type: 'order:created',
      title: `New Order ${order.orderNumber}`,
      message: `${order.orderType} order${order.tableNumber ? ` · Table T-${order.tableNumber}` : ''} · ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
      data: { orderId: order._id, orderNumber: order.orderNumber, tableNumber: order.tableNumber, actionUrl: '/kitchen' },
      priority: order.isUrgent ? 'urgent' : 'high',
    });

    res.status(201).json({ success: true, message: 'Order created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders ───────────────────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const { status, orderType, deliveryRiderId, date } = req.query;
    const filter = { ...tf(req) };

    if (status)          filter.status          = { $in: status.split(',') };
    if (orderType)       filter.orderType       = orderType;
    if (deliveryRiderId) filter.deliveryRiderId = deliveryRiderId;
    if (date === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end   = new Date(); end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await populateOrder(Order.find(filter).sort({ createdAt: -1 }));
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/kitchen ───────────────────────────────────────────────────
export const getKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      ...tf(req),
      status: { $in: ['Pending', 'Cooking', 'Ready'] },
    }).sort({ isUrgent: -1, createdAt: 1 });

    res.json({
      success: true,
      data: {
        pending: orders.filter((o) => o.status === 'Pending'),
        cooking: orders.filter((o) => o.status === 'Cooking'),
        ready:   orders.filter((o) => o.status === 'Ready'),
      },
      totalPending: orders.filter((o) => o.status === 'Pending').length,
      totalCooking: orders.filter((o) => o.status === 'Cooking').length,
      totalReady:   orders.filter((o) => o.status === 'Ready').length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/ready-to-serve — waiter view ──────────────────────────────
export const getReadyOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ ...tf(req), status: 'Ready' }).sort({ readyAt: 1 })
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/active ────────────────────────────────────────────────────
export const getActiveOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ ...tf(req), status: { $in: ['Pending', 'Cooking', 'Ready'] } })
        .sort({ isUrgent: -1, createdAt: 1 })
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/today ─────────────────────────────────────────────────────
export const getTodayOrders = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const orders    = await Order.find({ ...tf(req), createdAt: { $gte: start, $lte: end } });
    const completed = orders.filter((o) => o.status === 'Completed');
    const totalSales = completed.reduce((s, o) => s + o.totalAmount, 0);

    res.json({ success: true, data: { orders, totalOrders: orders.length, completedOrders: completed.length, totalSales } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    const order = await populateOrder(Order.findOne({ _id: req.params.id, ...tf(req) }));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/orders/:id/status — role-enforced transitions ──────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, notes, deliveryRiderId } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Please provide status' });

    const userRole = req.user.role;

    // Enforce per-role allowed transitions
    const allowed = ROLE_ALLOWED_TRANSITIONS[userRole] || [];
    if (!allowed.includes(status)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${userRole}) cannot set order status to '${status}'`,
      });
    }

    let order = await Order.findOne({ _id: req.params.id, ...tf(req) });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (['Completed', 'Cancelled'].includes(order.status))
      return res.status(400).json({ success: false, message: `Cannot change a ${order.status} order` });

    const prev   = order.status;
    order.status = status;
    if (notes)           order.notes          = notes;
    if (deliveryRiderId) order.deliveryRiderId = deliveryRiderId;

    const now = new Date();
    if (status === 'Cooking' && !order.startedCookingAt) {
      order.startedCookingAt = now;
      order.acceptedAt       = now;
      order.kitchenStaffId   = req.user._id;
    }
    if (status === 'Ready' && !order.readyAt) {
      order.readyAt = now;
      order.readyBy = req.user._id;
    }
    if (status === 'Served' && !order.servedAt) {
      order.servedAt = now;
      order.servedBy = req.user._id;
      if (req.user.role === 'waiter') order.waiterId = req.user._id;
    }
    if (status === 'Completed' && !order.completedAt) {
      order.completedAt   = now;
      order.completedBy   = req.user._id;
      order.paymentStatus = 'Paid';
    }

    order.timeline.push({ status, by: req.user._id, byName: req.user.name, at: now });
    order = await order.save();

    const populated = await populateOrder(Order.findById(order._id));
    const rid       = req.restaurantId;

    // ── Emit specific + generic events ───────────────────────────────────────
    const base = {
      orderId: order._id, orderNumber: order.orderNumber,
      tableNumber: order.tableNumber, isUrgent: order.isUrgent,
      status, prevStatus: prev, at: now,
    };

    // Generic broadcast to whole restaurant (kitchen + waiters + cashiers all listen to this)
    emitToRestaurant(rid, 'order:status:changed', base);

    if (status === 'Cooking') {
      emitToKitchen(rid, 'order:accepted', base);
    }

    if (status === 'Ready') {
      const readyPayload = {
        ...base,
        itemCount:    order.items.length,
        customerName: order.customerName,
      };
      emitToWaiters(rid,  'order:ready', readyPayload);
      emitToManagers(rid, 'order:ready', readyPayload);

      createAndEmit({
        restaurantId: rid, role: 'waiter',
        type: 'order:status:changed',
        title: `Order Ready — Table T-${order.tableNumber || '?'}`,
        message: `Order ${order.orderNumber} (${order.items.length} item${order.items.length !== 1 ? 's' : ''}) is ready to serve`,
        data: {
          orderId: order._id, orderNumber: order.orderNumber,
          tableNumber: order.tableNumber, itemCount: order.items.length,
          customerName: order.customerName, actionUrl: '/waiter/ready',
        },
        priority: 'high',
      });
    }

    if (status === 'Served') {
      // Look up the related bill to include grand total in cashier notification
      const bill = order.billId
        ? await Bill.findById(order.billId).select('grandTotal').lean()
        : null;
      const grandTotal = bill?.grandTotal ?? order.totalAmount;

      const servedPayload = {
        ...base,
        customerName: order.customerName,
        grandTotal,
        billId: order.billId || null,
      };
      emitToCashiers(rid, 'order:served', servedPayload);
      emitToManagers(rid, 'order:served', servedPayload);

      createAndEmit({
        restaurantId: rid, role: 'cashier',
        type: 'order:status:changed',
        title: `Order Served — Table T-${order.tableNumber || '?'}`,
        message: `Order ${order.orderNumber} served · Total: Rs ${Math.round(grandTotal).toLocaleString()}`,
        data: {
          orderId: order._id, orderNumber: order.orderNumber,
          tableNumber: order.tableNumber, grandTotal,
          customerName: order.customerName,
          billId: order.billId, actionUrl: '/cashier/bills',
        },
        priority: 'high',
      });
    }

    res.json({ success: true, message: 'Status updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/orders/:id/item/:itemIndex/status ──────────────────────────────
export const updateItemStatus = async (req, res) => {
  try {
    const { status }        = req.body;
    const { id, itemIndex } = req.params;

    let order = await Order.findOne({ _id: id, ...tf(req) });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const idx = parseInt(itemIndex, 10);
    if (idx >= order.items.length)
      return res.status(400).json({ success: false, message: 'Invalid item index' });

    order.items[idx].status = status;
    order = await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/orders/:id/items ────────────────────────────────────────────────
export const addItemToOrder = async (req, res) => {
  try {
    const { itemId, quantity, specialInstructions } = req.body;

    let order = await Order.findOne({ _id: req.params.id, ...tf(req) });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const dbItem = await Item.findOne({ _id: itemId, ...tf(req) });
    if (!dbItem) return res.status(404).json({ success: false, message: 'Item not found' });

    const existing = order.items.findIndex((i) => i.itemId.toString() === itemId);
    if (existing > -1) {
      order.items[existing].quantity += quantity || 1;
    } else {
      order.items.push({ itemId, itemName: dbItem.name, quantity: quantity || 1, price: dbItem.price, specialInstructions: specialInstructions || '', status: 'Pending' });
    }

    order = await order.save();
    res.json({ success: true, message: 'Item added', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/orders/:id/items/:itemIndex ───────────────────────────────────
export const removeItemFromOrder = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;

    let order = await Order.findOne({ _id: id, ...tf(req) });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const idx = parseInt(itemIndex, 10);
    if (idx >= order.items.length)
      return res.status(400).json({ success: false, message: 'Invalid item index' });

    order.items.splice(idx, 1);
    order = await order.save();
    res.json({ success: true, message: 'Item removed', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/orders/:id/complete ─────────────────────────────────────────────
// Creates the bill and marks order complete. Called by cashier after payment.
export const completeOrder = async (req, res) => {
  try {
    const { paymentMethod, amountPaid, transactionReference } = req.body;

    let order = await Order.findOne({ _id: req.params.id, ...tf(req) })
      .populate('waiterId', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'Completed')
      return res.status(400).json({ success: false, message: 'Order already completed' });

    const now = new Date();
    order.status        = 'Completed';
    order.completedAt   = now;
    order.completedBy   = req.user._id;
    order.paymentMethod = paymentMethod || 'Cash';
    order.amountPaid    = amountPaid    || order.totalAmount;
    order.changeAmount  = Math.max(0, (amountPaid || 0) - order.totalAmount);
    order.paymentStatus = (amountPaid || 0) >= order.totalAmount ? 'Paid' : 'Partial';
    order.timeline.push({ status: 'Completed', by: req.user._id, byName: req.user.name, at: now });
    await order.save();

    const bill = await Bill.create({
      restaurantId: order.restaurantId,
      branchId:     order.branchId,
      orderId:      order._id,
      orderNumber:  order.orderNumber,
      tableNo:      order.tableNumber || 0,
      customerName: order.customerName,
      waiterName:   order.waiterId?.name || null,
      waiterId:     order.waiterId?._id  || null,
      kitchenReadyAt: order.readyAt,
      servedAt:       order.servedAt,
      items:   order.items.map((i) => ({ itemId: i.itemId, name: i.itemName, price: i.price, quantity: i.quantity })),
      subtotal:             order.subtotal,
      taxPercentage:        0,
      taxAmount:            order.taxAmount || 0,
      serviceTaxPercentage: 0,
      serviceTaxAmount:     0,
      totalAmount:          order.totalAmount,
      discountValue:        0,
      discountAmount:       0,
      grandTotal:           order.totalAmount,
      paymentMethod:        paymentMethod || 'Cash',
      paymentStatus:        'paid',
      paidAt:               now,
      paidBy:               req.user._id,
      paidByName:           req.user.name,
      transactionReference: transactionReference || null,
      status:               'active',
      createdBy:            req.user._id,
    });

    order.billId = bill._id;
    await order.save();

    // Free the table
    if (order.tableNumber && order.orderType === 'DineIn') {
      const table = await Table.findOne({ tableNumber: order.tableNumber, ...tf(req) });
      if (table) {
        table.status         = 'Available';
        table.currentOrderId = null;
        table.occupiedBy     = null;
        table.needsCleaning  = true;
        await table.save();

        const rid = req.restaurantId;
        emitToWaiters(rid,   'table:available', { tableId: table._id, tableNumber: table.tableNumber, at: now });
        emitToManagers(rid,  'table:available', { tableId: table._id, tableNumber: table.tableNumber, at: now });
        emitToRestaurant(rid,'table:status:changed', { tableId: table._id, tableNumber: table.tableNumber, status: 'Available', at: now });
      }
    }

    const rid = req.restaurantId;
    emitToRestaurant(rid, 'order:status:changed', { orderId: order._id, orderNumber: order.orderNumber, status: 'Completed', tableNumber: order.tableNumber, at: now });
    emitToCashiers(rid,   'bill:paid',    { billId: bill._id, orderId: order._id, orderNumber: order.orderNumber, grandTotal: bill.grandTotal, tableNo: bill.tableNo, paymentMethod: bill.paymentMethod, at: now });
    emitToManagers(rid,   'bill:paid',    { billId: bill._id, orderId: order._id, grandTotal: bill.grandTotal, at: now });

    createAndEmit({
      restaurantId: rid, role: 'manager',
      type: 'bill:paid',
      title: `Payment Received — Table T-${order.tableNumber || '?'}`,
      message: `${order.orderNumber} · Rs ${Math.round(bill.grandTotal).toLocaleString()} via ${paymentMethod || 'Cash'}`,
      data: { billId: bill._id, orderId: order._id, orderNumber: order.orderNumber, grandTotal: bill.grandTotal, tableNumber: order.tableNumber },
      priority: 'normal',
    });

    res.json({ success: true, message: 'Order completed and payment recorded', data: { order, bill } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/orders/:id/cancel ───────────────────────────────────────────────
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    let order = await Order.findOne({ _id: req.params.id, ...tf(req) });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (['Completed', 'Cancelled'].includes(order.status))
      return res.status(400).json({ success: false, message: `Cannot cancel ${order.status} order` });
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: 'Cancellation reason is required' });

    const now = new Date();
    order.status             = 'Cancelled';
    order.cancelledBy        = req.user._id;
    order.cancellationReason = reason.trim();
    order.cancelledAt        = now;
    order.timeline.push({ status: 'Cancelled', by: req.user._id, byName: req.user.name, at: now, note: reason.trim() });
    order = await order.save();

    if (order.tableNumber && order.orderType === 'DineIn') {
      const table = await Table.findOne({ tableNumber: order.tableNumber, ...tf(req) });
      if (table && table.currentOrderId?.toString() === order._id.toString()) {
        table.status         = 'Available';
        table.currentOrderId = null;
        table.occupiedBy     = null;
        await table.save();
        emitToRestaurant(req.restaurantId, 'table:status:changed', { tableId: table._id, tableNumber: table.tableNumber, status: 'Available', at: now });
        emitToWaiters(req.restaurantId, 'table:available', { tableId: table._id, tableNumber: table.tableNumber, at: now });
      }
    }

    const rid          = req.restaurantId;
    const cancelPayload = { orderId: order._id, orderNumber: order.orderNumber, status: 'Cancelled', reason: order.cancellationReason, tableNumber: order.tableNumber, at: now };
    emitToRestaurant(rid, 'order:status:changed', cancelPayload);
    emitToKitchen(rid,    'order:status:changed', cancelPayload);

    res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/completed ─────────────────────────────────────────────────
export const getCompletedOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ ...tf(req), status: 'Completed' }).sort({ completedAt: -1 }).limit(50)
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/orders/stats — KPI reporting ─────────────────────────────────────
export const getOrderKPIs = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const completed = await Order.find({
      ...tf(req),
      status: 'Completed',
      completedAt: { $gte: start, $lte: end },
      readyAt:     { $exists: true },
      servedAt:    { $exists: true },
    }).select('createdAt startedCookingAt readyAt servedAt completedAt waiterId kitchenStaffId tableNumber totalAmount');

    const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const diff = (a, b) => a && b ? Math.round((new Date(a) - new Date(b)) / 60000) : null;

    const kitchenTimes  = completed.map((o) => diff(o.readyAt, o.startedCookingAt)).filter((v) => v !== null && v >= 0);
    const servingTimes  = completed.map((o) => diff(o.servedAt, o.readyAt)).filter((v) => v !== null && v >= 0);
    const paymentTimes  = completed.map((o) => diff(o.completedAt, o.servedAt)).filter((v) => v !== null && v >= 0);
    const turnarounds   = completed.map((o) => diff(o.completedAt, o.createdAt)).filter((v) => v !== null && v >= 0);

    // Longest waiting orders (more than 20 min from creation to ready)
    const longest = completed
      .map((o) => ({ orderNumber: o.orderNumber, tableNumber: o.tableNumber, mins: diff(o.readyAt, o.createdAt) }))
      .filter((o) => o.mins !== null && o.mins >= 0)
      .sort((a, b) => b.mins - a.mins)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        date: start.toISOString().slice(0, 10),
        ordersCompleted:           completed.length,
        avgKitchenTimeMin:         avg(kitchenTimes),
        avgServingTimeMin:         avg(servingTimes),
        avgPaymentTimeMin:         avg(paymentTimes),
        avgTableTurnaroundMin:     avg(turnarounds),
        longestWaitingOrders:      longest,
        totalRevenue:              completed.reduce((s, o) => s + (o.totalAmount || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
