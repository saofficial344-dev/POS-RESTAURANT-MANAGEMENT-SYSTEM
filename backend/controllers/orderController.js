import Order from '../models/Order.js';
import Item from '../models/Item.js';
import Bill from '../models/Bill.js';
import Table from '../models/Table.js';

const populateOrder = (query) =>
  query
    .populate('createdBy', 'name role')
    .populate('waiterId', 'name role')
    .populate('kitchenStaffId', 'name role')
    .populate('deliveryRiderId', 'name role')
    .populate('completedBy', 'name role')
    .populate('cancelledBy', 'name role');

// POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const {
      orderType,
      tableNumber,
      numberOfGuests,
      customerName,
      customerPhone,
      items,
      notes,
      deliveryAddress,
      isUrgent,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide at least one item' });
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbItem = await Item.findById(item.itemId);
      if (!dbItem) {
        return res
          .status(404)
          .json({ success: false, message: `Item not found: ${item.itemId}` });
      }
      subtotal += dbItem.price * item.quantity;
      validatedItems.push({
        itemId: dbItem._id,
        itemName: dbItem.name,
        quantity: item.quantity,
        price: dbItem.price,
        specialInstructions: item.specialInstructions || '',
        status: 'Pending',
      });
    }

    const deliveryCharge = orderType === 'Delivery' ? 100 : 0;
    const totalAmount = subtotal + deliveryCharge;

    const order = await Order.create({
      orderType: orderType || 'WalkIn',
      tableNumber: orderType === 'DineIn' ? tableNumber : null,
      numberOfGuests: numberOfGuests || 1,
      customerName: customerName || 'Customer',
      customerPhone: customerPhone || null,
      items: validatedItems,
      subtotal,
      deliveryCharge,
      totalAmount,
      createdBy: req.user._id,
      waiterId: req.user.role === 'waiter' ? req.user._id : null,
      notes,
      deliveryAddress: orderType === 'Delivery' ? deliveryAddress : null,
      isUrgent: isUrgent || false,
      status: 'Pending',
    });

    // Auto-occupy table for DineIn orders
    if (orderType === 'DineIn' && tableNumber) {
      const table = await Table.findOne({ tableNumber });
      if (table && table.status === 'Available') {
        table.status = 'Occupied';
        table.currentOrderId = order._id;
        table.occupiedBy = {
          numberOfGuests: numberOfGuests || 1,
          customerName: customerName || '',
          checkinTime: new Date(),
        };
        await table.save();
      }
    }

    const populated = await populateOrder(Order.findById(order._id));
    res
      .status(201)
      .json({ success: true, message: 'Order created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, orderType, deliveryRiderId, date } = req.query;
    const filter = {};

    if (status) filter.status = { $in: status.split(',') };
    if (orderType) filter.orderType = orderType;
    if (deliveryRiderId) filter.deliveryRiderId = deliveryRiderId;

    if (date === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await populateOrder(
      Order.find(filter).sort({ createdAt: -1 })
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/kitchen — organized by status for kitchen display
export const getKitchenOrders = async (req, res) => {
  try {
    const activeStatuses = ['Pending', 'Cooking', 'Ready'];
    const orders = await Order.find({ status: { $in: activeStatuses } })
      .sort({ isUrgent: -1, createdAt: 1 });

    res.json({
      success: true,
      data: {
        pending: orders.filter((o) => o.status === 'Pending'),
        cooking: orders.filter((o) => o.status === 'Cooking'),
        ready: orders.filter((o) => o.status === 'Ready'),
      },
      totalPending: orders.filter((o) => o.status === 'Pending').length,
      totalCooking: orders.filter((o) => o.status === 'Cooking').length,
      totalReady: orders.filter((o) => o.status === 'Ready').length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/active
export const getActiveOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ status: { $in: ['Pending', 'Cooking', 'Ready'] } }).sort({
        isUrgent: -1,
        createdAt: 1,
      })
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/today
export const getTodayOrders = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
    const completed = orders.filter((o) => o.status === 'Completed');
    const totalSales = completed.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      success: true,
      data: {
        orders,
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalSales,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id
export const getOrder = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id));
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, notes, deliveryRiderId } = req.body;

    if (!status)
      return res
        .status(400)
        .json({ success: false, message: 'Please provide status' });

    let order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    order.status = status;
    if (notes) order.notes = notes;
    if (deliveryRiderId) order.deliveryRiderId = deliveryRiderId;

    if (status === 'Cooking' && !order.startedCookingAt) {
      order.startedCookingAt = new Date();
      order.kitchenStaffId = req.user._id;
    }
    if (status === 'Ready' && !order.readyAt) order.readyAt = new Date();
    if (status === 'Served' && !order.servedAt) order.servedAt = new Date();
    if (status === 'Completed' && !order.completedAt) {
      order.completedAt = new Date();
      order.paymentStatus = 'Paid';
    }

    order = await order.save();
    const populated = await populateOrder(Order.findById(order._id));
    res.json({ success: true, message: 'Status updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/item/:itemIndex/status
export const updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id, itemIndex } = req.params;

    let order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    const idx = parseInt(itemIndex, 10);
    if (idx >= order.items.length)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid item index' });

    order.items[idx].status = status;
    order = await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/items
export const addItemToOrder = async (req, res) => {
  try {
    const { itemId, quantity, specialInstructions } = req.body;

    let order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    const dbItem = await Item.findById(itemId);
    if (!dbItem)
      return res
        .status(404)
        .json({ success: false, message: 'Item not found' });

    const existing = order.items.findIndex(
      (i) => i.itemId.toString() === itemId
    );

    if (existing > -1) {
      order.items[existing].quantity += quantity || 1;
    } else {
      order.items.push({
        itemId,
        itemName: dbItem.name,
        quantity: quantity || 1,
        price: dbItem.price,
        specialInstructions: specialInstructions || '',
        status: 'Pending',
      });
    }

    order = await order.save();
    res.json({ success: true, message: 'Item added', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/orders/:id/items/:itemIndex
export const removeItemFromOrder = async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    let order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    const idx = parseInt(itemIndex, 10);
    if (idx >= order.items.length)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid item index' });

    order.items.splice(idx, 1);
    order = await order.save();
    res.json({ success: true, message: 'Item removed', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/complete
export const completeOrder = async (req, res) => {
  try {
    const { paymentMethod, amountPaid } = req.body;

    let order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    if (order.status === 'Completed')
      return res
        .status(400)
        .json({ success: false, message: 'Order already completed' });

    order.status = 'Completed';
    order.completedAt = new Date();
    order.completedBy = req.user._id;
    order.paymentMethod = paymentMethod || 'Cash';
    order.amountPaid = amountPaid || order.totalAmount;
    order.changeAmount = Math.max(0, (amountPaid || 0) - order.totalAmount);
    order.paymentStatus =
      (amountPaid || 0) >= order.totalAmount ? 'Paid' : 'Partial';

    await order.save();

    // Bill.paymentMethod only accepts Cash | Card — map everything else to Cash
    const billPayMethod = ['Cash', 'Card'].includes(paymentMethod) ? paymentMethod : 'Cash';

    // Create Bill (matching Bill schema exactly)
    const bill = await Bill.create({
      tableNo: order.tableNumber || 0,
      items: order.items.map((i) => ({
        itemId: i.itemId,
        name: i.itemName,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal: order.subtotal,
      taxPercentage: 0,
      taxAmount: order.taxAmount || 0,
      serviceTaxPercentage: 0,
      serviceTaxAmount: 0,
      totalAmount: order.totalAmount,
      discountValue: 0,
      discountAmount: 0,
      grandTotal: order.totalAmount,
      paymentMethod: billPayMethod,
      status: 'active',
      createdBy: req.user._id,
    });

    order.billId = bill._id;
    await order.save();

    // Free the table if DineIn
    if (order.tableNumber && order.orderType === 'DineIn') {
      const table = await Table.findOne({ tableNumber: order.tableNumber });
      if (table) {
        table.status = 'Available';
        table.currentOrderId = null;
        table.occupiedBy = null;
        table.needsCleaning = true;
        await table.save();
      }
    }

    res.json({
      success: true,
      message: 'Order completed and bill generated',
      data: { order, bill },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/cancel
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    if (['Completed', 'Cancelled'].includes(order.status))
      return res
        .status(400)
        .json({ success: false, message: `Cannot cancel ${order.status} order` });

    if (!reason || !reason.trim())
      return res
        .status(400)
        .json({ success: false, message: 'Cancellation reason is required' });

    order.status = 'Cancelled';
    order.cancelledBy = req.user._id;
    order.cancellationReason = reason.trim();
    order.cancelledAt = new Date();
    order = await order.save();

    // Free table if it was DineIn
    if (order.tableNumber && order.orderType === 'DineIn') {
      const table = await Table.findOne({ tableNumber: order.tableNumber });
      if (table && table.currentOrderId?.toString() === order._id.toString()) {
        table.status = 'Available';
        table.currentOrderId = null;
        table.occupiedBy = null;
        await table.save();
      }
    }

    res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/completed
export const getCompletedOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ status: 'Completed' }).sort({ completedAt: -1 }).limit(50)
    );
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
