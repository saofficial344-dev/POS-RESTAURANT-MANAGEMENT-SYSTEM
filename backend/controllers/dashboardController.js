import Order from '../models/Order.js';
import Bill from '../models/Bill.js';
import User from '../models/User.js';
import Table from '../models/Table.js';
import Item from '../models/Item.js';
import Category from '../models/Category.js';

// ─── helpers ──────────────────────────────────────────────────────────────────
const sum = (arr, key = null) =>
  arr.reduce((acc, b) => acc + (key ? (b[key] || 0) : (b.grandTotal || b.totalAmount || 0)), 0);

// GET /api/dashboard/stats  — admin + manager
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekStart  = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    // ── Revenue from Bills ──────────────────────────────────────────────────────
    const [todayBills, weekBills, monthBills, yearBills] = await Promise.all([
      Bill.find({ createdAt: { $gte: todayStart, $lte: todayEnd }, status: 'active' }),
      Bill.find({ createdAt: { $gte: weekStart }, status: 'active' }),
      Bill.find({ createdAt: { $gte: monthStart }, status: 'active' }),
      Bill.find({ createdAt: { $gte: yearStart }, status: 'active' }),
    ]);

    const revenue = {
      today:          sum(todayBills),
      week:           sum(weekBills),
      month:          sum(monthBills),
      year:           sum(yearBills),
      todayBillCount: todayBills.length,
      weekBillCount:  weekBills.length,
      monthBillCount: monthBills.length,
    };

    // ── Today's Orders ──────────────────────────────────────────────────────────
    const todayOrders = await Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd } });
    const orders = {
      today:     todayOrders.length,
      pending:   todayOrders.filter(o => o.status === 'Pending').length,
      cooking:   todayOrders.filter(o => o.status === 'Cooking').length,
      ready:     todayOrders.filter(o => o.status === 'Ready').length,
      completed: todayOrders.filter(o => o.status === 'Completed').length,
      cancelled: todayOrders.filter(o => o.status === 'Cancelled').length,
      walkIn:    todayOrders.filter(o => o.orderType === 'WalkIn').length,
      dineIn:    todayOrders.filter(o => o.orderType === 'DineIn').length,
      delivery:  todayOrders.filter(o => o.orderType === 'Delivery').length,
    };
    const activeOrderCount = await Order.countDocuments({ status: { $in: ['Pending', 'Cooking', 'Ready'] } });

    // ── Staff ──────────────────────────────────────────────────────────────────
    const activeUsers = await User.find({ status: 'active' });
    const staff = {
      total:    activeUsers.length,
      cashiers: activeUsers.filter(u => u.role === 'cashier').length,
      waiters:  activeUsers.filter(u => u.role === 'waiter').length,
      kitchen:  activeUsers.filter(u => u.role === 'kitchen').length,
      delivery: activeUsers.filter(u => u.role === 'delivery').length,
      managers: activeUsers.filter(u => u.role === 'manager').length,
    };

    // ── Tables ─────────────────────────────────────────────────────────────────
    const allTables = await Table.find();
    const tables = {
      total:       allTables.length,
      available:   allTables.filter(t => t.status === 'Available').length,
      occupied:    allTables.filter(t => t.status === 'Occupied').length,
      reserved:    allTables.filter(t => t.status === 'Reserved').length,
      maintenance: allTables.filter(t => t.status === 'Maintenance').length,
      occupancyRate: allTables.length > 0
        ? Math.round((allTables.filter(t => t.status === 'Occupied').length / allTables.length) * 100)
        : 0,
    };

    // ── Menu / Inventory ────────────────────────────────────────────────────────
    const allItems = await Item.find();
    const totalCategories = await Category.countDocuments();
    const menu = {
      totalItems:      allItems.length,
      totalCategories,
      available:       allItems.filter(i => i.available !== false).length,
      unavailable:     allItems.filter(i => i.available === false).length,
    };

    // ── Weekly Revenue Chart (last 7 days) ──────────────────────────────────────
    const weeklyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day   = new Date(now); day.setDate(day.getDate() - i);
      const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
      const dEnd   = new Date(day); dEnd.setHours(23, 59, 59, 999);
      const dayBills = await Bill.find({ createdAt: { $gte: dStart, $lte: dEnd }, status: 'active' });
      const dayOrders = await Order.find({ createdAt: { $gte: dStart, $lte: dEnd } });
      weeklyRevenue.push({
        day:     day.toLocaleDateString('en-US', { weekday: 'short' }),
        date:    day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: sum(dayBills),
        bills:   dayBills.length,
        orders:  dayOrders.length,
      });
    }

    // ── Yearly Revenue Chart (last 12 months) ───────────────────────────────────
    const yearlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const mBills  = await Bill.find({ createdAt: { $gte: mStart, $lte: mEnd }, status: 'active' });
      const mOrders = await Order.find({ createdAt: { $gte: mStart, $lte: mEnd } });
      yearlyRevenue.push({
        month:   mStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: sum(mBills),
        orders:  mOrders.length,
        bills:   mBills.length,
      });
    }

    // ── Orders by Hour (today) ──────────────────────────────────────────────────
    const todayOrdersForHours = await Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd } });
    const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
      hour:  `${String(h).padStart(2, '0')}:00`,
      count: todayOrdersForHours.filter(o => new Date(o.createdAt).getHours() === h).length,
    }));

    // ── Payment Breakdown (this month from Bills) ───────────────────────────────
    const paymentCounts = monthBills.reduce((acc, b) => {
      const method = b.paymentMethod || 'Cash';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});
    const paymentRevenue = monthBills.reduce((acc, b) => {
      const method = b.paymentMethod || 'Cash';
      acc[method] = (acc[method] || 0) + (b.grandTotal || b.totalAmount || 0);
      return acc;
    }, {});
    const paymentBreakdown = Object.keys({ ...paymentCounts, ...paymentRevenue }).map(method => ({
      name:    method,
      count:   paymentCounts[method] || 0,
      revenue: paymentRevenue[method] || 0,
    }));

    // ── Order Status Breakdown (this month) ────────────────────────────────────
    const monthOrders = await Order.find({ createdAt: { $gte: monthStart } });
    const statusBreakdown = [
      { name: 'Pending',   value: monthOrders.filter(o => o.status === 'Pending').length,   color: '#F59E0B' },
      { name: 'Cooking',   value: monthOrders.filter(o => o.status === 'Cooking').length,   color: '#8B5CF6' },
      { name: 'Ready',     value: monthOrders.filter(o => o.status === 'Ready').length,     color: '#10B981' },
      { name: 'Served',    value: monthOrders.filter(o => o.status === 'Served').length,    color: '#3B82F6' },
      { name: 'Completed', value: monthOrders.filter(o => o.status === 'Completed').length, color: '#6366F1' },
      { name: 'Cancelled', value: monthOrders.filter(o => o.status === 'Cancelled').length, color: '#EF4444' },
    ].filter(s => s.value > 0);

    // ── Order Type Breakdown (this month) ───────────────────────────────────────
    const orderTypeBreakdown = [
      { name: 'Dine-In',  value: monthOrders.filter(o => o.orderType === 'DineIn').length,   color: '#6366F1' },
      { name: 'Walk-In',  value: monthOrders.filter(o => o.orderType === 'WalkIn').length,   color: '#3B82F6' },
      { name: 'Delivery', value: monthOrders.filter(o => o.orderType === 'Delivery').length, color: '#F97316' },
    ].filter(o => o.value > 0);

    // ── Top Selling Items (last 30 days from bills) ─────────────────────────────
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBillsForTop = await Bill.find({ createdAt: { $gte: thirtyDaysAgo }, status: 'active' });
    const itemMap = {};
    recentBillsForTop.forEach(bill => {
      (bill.items || []).forEach(item => {
        const key = item.name || item.itemName || 'Unknown';
        if (!itemMap[key]) itemMap[key] = { name: key, quantity: 0, revenue: 0 };
        itemMap[key].quantity += item.quantity || 0;
        itemMap[key].revenue  += (item.price || 0) * (item.quantity || 0);
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 8);

    // ── Employee Performance (this month) ───────────────────────────────────────
    // Cashiers: group bills by createdBy
    const cashierBillMap = {};
    monthBills.forEach(b => {
      const id = String(b.createdBy || 'unknown');
      if (!cashierBillMap[id]) cashierBillMap[id] = { userId: id, bills: 0, revenue: 0 };
      cashierBillMap[id].bills++;
      cashierBillMap[id].revenue += b.grandTotal || b.totalAmount || 0;
    });

    // Populate user names for cashier performance
    const cashierUserIds = Object.keys(cashierBillMap).filter(id => id !== 'unknown');
    const cashierUsers   = cashierUserIds.length > 0
      ? await User.find({ _id: { $in: cashierUserIds } }, 'name role')
      : [];

    const cashierPerformance = Object.values(cashierBillMap)
      .map(c => {
        const user = cashierUsers.find(u => String(u._id) === c.userId);
        return { name: user?.name || 'Unknown', role: 'cashier', bills: c.bills, revenue: c.revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Waiter orders this month
    const monthOrdersWithWaiter = monthOrders.filter(o => o.waiterId);
    const waiterMap = {};
    monthOrdersWithWaiter.forEach(o => {
      const id = String(o.waiterId);
      waiterMap[id] = (waiterMap[id] || 0) + 1;
    });
    const waiterUserIds = Object.keys(waiterMap);
    const waiterUsers   = waiterUserIds.length > 0
      ? await User.find({ _id: { $in: waiterUserIds } }, 'name')
      : [];
    const waiterPerformance = waiterUserIds
      .map(id => {
        const user = waiterUsers.find(u => String(u._id) === id);
        return { name: user?.name || 'Unknown', role: 'waiter', orders: waiterMap[id] };
      })
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Role-based staff summary for chart
    const staffChart = [
      { role: 'Cashiers',  count: staff.cashiers  },
      { role: 'Waiters',   count: staff.waiters   },
      { role: 'Kitchen',   count: staff.kitchen   },
      { role: 'Delivery',  count: staff.delivery  },
      { role: 'Managers',  count: staff.managers  },
    ].filter(s => s.count > 0);

    // ── Delivery stats ──────────────────────────────────────────────────────────
    const deliveryOrders = await Order.find({ orderType: 'Delivery', createdAt: { $gte: todayStart, $lte: todayEnd } });
    const delivery = {
      today:     deliveryOrders.length,
      pending:   deliveryOrders.filter(o => o.status === 'Pending').length,
      inTransit: deliveryOrders.filter(o => o.status === 'Served').length,
      completed: deliveryOrders.filter(o => o.status === 'Completed').length,
    };

    // ── Activity Feed (last 20 combined events) ─────────────────────────────────
    const [recentOrders, recentBillsForFeed] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(10).populate('createdBy', 'name'),
      Bill.find({ status: 'active' }).sort({ createdAt: -1 }).limit(8).populate('createdBy', 'name'),
    ]);

    const orderEvents = recentOrders.map(o => ({
      id:      String(o._id),
      type:    'order',
      icon:    o.status === 'Completed' ? 'check' : o.status === 'Cancelled' ? 'x' : o.isUrgent ? 'alert' : 'order',
      message: `${o.orderType === 'DineIn' ? `Table ${o.tableNumber}` : o.orderType} order #${String(o._id).slice(-5).toUpperCase()} — ${o.status}`,
      by:      o.createdBy?.name || 'Staff',
      status:  o.status,
      urgent:  o.isUrgent,
      time:    o.createdAt,
    }));

    const billEvents = recentBillsForFeed.map(b => ({
      id:      String(b._id),
      type:    'bill',
      icon:    'bill',
      message: `Bill #${String(b._id).slice(-5).toUpperCase()} — Table ${b.tableNo} — Rs ${Math.round(b.grandTotal || b.totalAmount || 0).toLocaleString()}`,
      by:      b.createdBy?.name || 'Cashier',
      status:  'Completed',
      urgent:  false,
      time:    b.createdAt,
    }));

    const activityFeed = [...orderEvents, ...billEvents]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 20);

    // ── Recent Bills (for table) ────────────────────────────────────────────────
    const recentBills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name');

    // ── Response ────────────────────────────────────────────────────────────────
    res.json({
      success: true,
      data: {
        revenue,
        orders:  { ...orders, active: activeOrderCount },
        staff,
        tables,
        menu,
        delivery,
        topItems,
        weeklyRevenue,
        yearlyRevenue,
        ordersByHour,
        statusBreakdown,
        orderTypeBreakdown,
        paymentBreakdown,
        cashierPerformance,
        waiterPerformance,
        staffChart,
        activityFeed,
        recentBills: recentBills.map(b => ({
          _id:          b._id,
          tableNo:      b.tableNo,
          grandTotal:   b.grandTotal || b.totalAmount || 0,
          paymentMethod: b.paymentMethod,
          createdAt:    b.createdAt,
          createdBy:    b.createdBy?.name || 'N/A',
          itemCount:    b.items?.length || 0,
          status:       b.status,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
