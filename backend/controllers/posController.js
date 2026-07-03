import Table from '../models/Table.js';
import Order from '../models/Order.js';
import User  from '../models/User.js';

export const getOrderTypes = async (req, res) => {
  try {
    const orderTypes = [
      { id: 1, name: 'Walk-In',  value: 'WalkIn',   icon: '🍽',  description: 'Counter Service', requiresTable: false },
      { id: 2, name: 'Dine-In',  value: 'DineIn',   icon: '🪑',  description: 'Table Service',   requiresTable: true  },
      { id: 3, name: 'Delivery', value: 'Delivery',  icon: '🚚',  description: 'Home Delivery',   requiresTable: false },
      { id: 4, name: 'Take Away',value: 'TakeAway',  icon: '📦',  description: 'Pack & Go',       requiresTable: false },
    ];
    res.status(200).json({ success: true, data: orderTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailableTables = async (req, res) => {
  try {
    const tf = { restaurantId: req.restaurantId || null };
    const tables = await Table.find(tf).sort({ tableNumber: 1 });

    const tablesWithStatus = tables.map((table) => ({
      ...table.toObject(),
      isAvailable: table.status === 'Available',
    }));

    res.status(200).json({ success: true, count: tables.length, data: tablesWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startOrder = async (req, res) => {
  try {
    const tf = { restaurantId: req.restaurantId || null };
    const { orderType, tableNumber, numberOfGuests, cashierId, waiterId } = req.body;

    if (!orderType || !cashierId) {
      return res.status(400).json({ success: false, message: 'Please provide order type and cashier' });
    }

    let table = null;
    if (orderType === 'DineIn' && tableNumber) {
      table = await Table.findOne({ ...tf, tableNumber });

      if (!table) {
        return res.status(404).json({ success: false, message: 'Table not found' });
      }
      if (table.status !== 'Available') {
        return res.status(400).json({ success: false, message: 'Table is not available' });
      }

      table.status = 'Occupied';
      table.occupiedBy = { numberOfGuests: numberOfGuests || table.capacity, checkinTime: new Date() };
      table = await table.save();
    }

    const cashier = await User.findOne({ ...tf, _id: cashierId });
    if (!cashier) {
      return res.status(404).json({ success: false, message: 'Cashier not found' });
    }

    res.status(200).json({
      success: true,
      message: 'POS workflow started',
      data: {
        orderType,
        tableNumber:    tableNumber || null,
        numberOfGuests: numberOfGuests || 1,
        cashierId,
        waiterId:       waiterId || null,
        cashierName:    cashier.name,
        tableName:      table ? `Table ${table.tableNumber}` : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPOSDashboard = async (req, res) => {
  try {
    const tf = { restaurantId: req.restaurantId || null };
    const { cashierId } = req.query;

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await Order.find({
      ...tf,
      createdAt: { $gte: today, $lt: tomorrow },
      ...(cashierId && { cashierId }),
    });

    const completedOrders = todayOrders.filter((o) => o.status === 'Completed');
    const totalSales      = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const activeTables = await Table.find({ ...tf, status: 'Occupied' });

    res.status(200).json({
      success: true,
      data: {
        totalOrders:       todayOrders.length,
        completedOrders:   completedOrders.length,
        totalSales,
        activeTables:      activeTables.length,
        averageOrderValue: completedOrders.length > 0 ? totalSales / completedOrders.length : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getKitchenDisplay = async (req, res) => {
  try {
    const tf = { restaurantId: req.restaurantId || null };
    const activeStatuses = ['Pending', 'Cooking', 'Ready'];

    const orders = await Order.find({ ...tf, status: { $in: activeStatuses } })
      .populate('cashierId', 'name')
      .populate('items.itemId', 'name category')
      .sort({ createdAt: 1 });

    const organizedOrders = {
      pending: orders.filter((o) => o.status === 'Pending'),
      cooking: orders.filter((o) => o.status === 'Cooking'),
      ready:   orders.filter((o) => o.status === 'Ready'),
    };

    res.status(200).json({
      success: true,
      data: organizedOrders,
      totalPending: organizedOrders.pending.length,
      totalCooking: organizedOrders.cooking.length,
      totalReady:   organizedOrders.ready.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearTable = async (req, res) => {
  try {
    const tf = { restaurantId: req.restaurantId || null };
    const table = await Table.findOne({ ...tf, tableNumber: req.params.tableNumber });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.status         = 'Available';
    table.currentOrderId = null;
    table.occupiedBy     = null;
    table.needsCleaning  = true;
    table.lastCleanedAt  = new Date();
    const updated = await table.save();

    res.status(200).json({ success: true, message: 'Table cleared successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
