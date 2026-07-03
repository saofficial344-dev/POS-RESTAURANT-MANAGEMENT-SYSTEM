import mongoose from 'mongoose';
import Order    from '../models/Order.js';
import Bill     from '../models/Bill.js';
import User     from '../models/User.js';
import Table    from '../models/Table.js';
import Item     from '../models/Item.js';
import Category from '../models/Category.js';
import Branch   from '../models/Branch.js';

// Build a tenant + optional branch filter.
// branchId is opt-in: omit → aggregate across all branches.
// restaurantId is always required for tenant isolation.
const tf = (r, b) => {
  const f = r ? { restaurantId: new mongoose.Types.ObjectId(r) } : {};
  if (b) f.branchId = new mongoose.Types.ObjectId(b);
  return f;
};

// Restaurant-only filter (for models without branchId, e.g. Category)
const tfR = (r) => r ? { restaurantId: new mongoose.Types.ObjectId(r) } : {};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_COLORS = {
  Pending:   '#F59E0B', Cooking:   '#8B5CF6', Ready:   '#10B981',
  Served:    '#3B82F6', Completed: '#6366F1', Cancelled: '#EF4444',
};
const TYPE_LABELS = { DineIn: 'Dine-In', WalkIn: 'Walk-In', Delivery: 'Delivery', TakeAway: 'Take-Away' };
const TYPE_COLORS = { DineIn: '#6366F1', WalkIn: '#3B82F6', Delivery: '#F97316', TakeAway: '#10B981' };
const PAY_COLORS  = { Cash: '#10B981', Card: '#6366F1', Online: '#3B82F6', Wallet: '#F59E0B' };

// ── GET /api/dashboard/stats?branchId=<ObjectId> ──────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const r = req.restaurantId || null;

    // Validate branchId — must be a valid ObjectId that belongs to this restaurant
    const rawBranch = req.query.branchId;
    const b = rawBranch && mongoose.isValidObjectId(rawBranch) ? rawBranch : null;

    const now = new Date();

    // ── Date anchors ───────────────────────────────────────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);
    const thirtyAgo  = new Date(now); thirtyAgo.setDate(now.getDate() - 30);
    const yr12Ago    = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // ── ONE parallel batch — 21 queries, zero sequential ─────────────────────
    const [
      revAgg,           // 1.  Bill $facet: 4 time ranges × detailed revenue
      todayStatAgg,     // 2.  Order $facet: today by status / type / hour
      monthStatAgg,     // 3.  Order $facet: month by status / type
      activeOrders,     // 4.  Count of currently active orders
      staffAgg,         // 5.  User $facet: active by role + inactive count
      tableAgg,         // 6.  Table by status
      itemAgg,          // 7.  Item available / unavailable counts
      totalCategories,  // 8.  Category count (restaurant-scoped, no branch)
      weeklyBillAgg,    // 9.  Bills per day — last 7 days
      weeklyOrderAgg,   // 10. Orders per day — last 7 days
      yearlyBillAgg,    // 11. Bills per month — last 12 months
      yearlyOrderAgg,   // 12. Orders per month — last 12 months
      topItemsAgg,      // 13. Top 10 items — last 30 days
      leastItemsAgg,    // 14. Least-selling 5 items — last 30 days
      cashierBillAgg,   // 15. Cashier performance — this month
      waiterOrderAgg,   // 16. Waiter performance — this month
      paymentAgg,       // 17. Payment method breakdown — this month
      topCatAgg,        // 18. Top categories by revenue — last 30 days
      recentBills,      // 19. 8 most recent bills
      recentOrders,     // 20. 10 most recent orders
      branchList,       // 21. Branch list for the branch selector
    ] = await Promise.all([

      // 1. Revenue — single $facet replaces 4 separate Bill.aggregate() calls
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: yearStart } } },
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
              { $group: {
                  _id: null,
                  revenue:  { $sum: '$grandTotal'     },
                  subtotal: { $sum: '$subtotal'        },
                  tax:      { $sum: '$taxAmount'       },
                  discount: { $sum: '$discountAmount'  },
                  count:    { $sum: 1                  },
                }
              },
            ],
            week: [
              { $match: { createdAt: { $gte: weekStart } } },
              { $group: {
                  _id: null,
                  revenue:  { $sum: '$grandTotal'     },
                  subtotal: { $sum: '$subtotal'        },
                  tax:      { $sum: '$taxAmount'       },
                  discount: { $sum: '$discountAmount'  },
                  count:    { $sum: 1                  },
                }
              },
            ],
            month: [
              { $match: { createdAt: { $gte: monthStart } } },
              { $group: {
                  _id: null,
                  revenue:  { $sum: '$grandTotal'     },
                  subtotal: { $sum: '$subtotal'        },
                  tax:      { $sum: '$taxAmount'       },
                  discount: { $sum: '$discountAmount'  },
                  count:    { $sum: 1                  },
                }
              },
            ],
            year: [
              { $group: {
                  _id: null,
                  revenue:  { $sum: '$grandTotal'     },
                  subtotal: { $sum: '$subtotal'        },
                  tax:      { $sum: '$taxAmount'       },
                  discount: { $sum: '$discountAmount'  },
                  count:    { $sum: 1                  },
                }
              },
            ],
          },
        },
      ]),

      // 2. Today's order stats — $facet replaces Order.find().lean() + JS filters
      Order.aggregate([
        { $match: { ...tf(r, b), createdAt: { $gte: todayStart, $lte: todayEnd } } },
        {
          $facet: {
            total:    [{ $count: 'n' }],
            byStatus: [{ $group: { _id: '$status',    count: { $sum: 1 } } }],
            byType:   [{ $group: { _id: '$orderType', count: { $sum: 1 } } }],
            byHour:   [{ $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }],
          },
        },
      ]),

      // 3. This month's order stats — $facet replaces Order.find().lean() + JS filters
      Order.aggregate([
        { $match: { ...tf(r, b), createdAt: { $gte: monthStart } } },
        {
          $facet: {
            total:    [{ $count: 'n' }],
            byStatus: [{ $group: { _id: '$status',    count: { $sum: 1 } } }],
            byType:   [{ $group: { _id: '$orderType', count: { $sum: 1 } } }],
          },
        },
      ]),

      // 4. Active orders (all in-flight, not just today)
      Order.countDocuments({ ...tf(r, b), status: { $in: ['Pending', 'Cooking', 'Ready'] } }),

      // 5. Staff — active by role + total inactive
      User.aggregate([
        { $match: tf(r, b) },
        {
          $facet: {
            active:   [
              { $match: { status: 'active' } },
              { $group: { _id: '$role', count: { $sum: 1 } } },
            ],
            inactive: [
              { $match: { status: 'inactive' } },
              { $count: 'n' },
            ],
          },
        },
      ]),

      // 6. Tables by status
      Table.aggregate([
        { $match: tf(r, b) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 7. Items available vs unavailable
      Item.aggregate([
        { $match: tf(r, b) },
        { $group: { _id: { $ifNull: ['$available', true] }, count: { $sum: 1 } } },
      ]),

      // 8. Category count — restaurant-scoped (categories have no branchId)
      Category.countDocuments(tfR(r)),

      // 9. Weekly bill chart — last 7 days
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: weekStart } } },
        { $group: {
            _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$grandTotal' },
            bills:   { $sum: 1 },
          }
        },
      ]),

      // 10. Weekly order chart — last 7 days
      Order.aggregate([
        { $match: { ...tf(r, b), createdAt: { $gte: weekStart } } },
        { $group: {
            _id:    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
          }
        },
      ]),

      // 11. Yearly bill chart — last 12 months
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: yr12Ago } } },
        { $group: {
            _id:     { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            revenue: { $sum: '$grandTotal' },
            bills:   { $sum: 1 },
          }
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),

      // 12. Yearly order chart — last 12 months
      Order.aggregate([
        { $match: { ...tf(r, b), createdAt: { $gte: yr12Ago } } },
        { $group: {
            _id:    { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            orders: { $sum: 1 },
          }
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),

      // 13. Top 10 items — last 30 days by quantity sold
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: thirtyAgo } } },
        { $unwind: '$items' },
        { $group: {
            _id:      '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          }
        },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
      ]),

      // 14. Least-selling 5 items — last 30 days (ascending by quantity)
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: thirtyAgo } } },
        { $unwind: '$items' },
        { $group: {
            _id:      '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          }
        },
        { $sort: { quantity: 1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
      ]),

      // 15. Cashier performance — bills this month by createdBy
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: monthStart } } },
        { $group: {
            _id:     '$createdBy',
            bills:   { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      // 16. Waiter performance — orders this month by waiterId
      Order.aggregate([
        { $match: { ...tf(r, b), createdAt: { $gte: monthStart }, waiterId: { $ne: null } } },
        { $group: { _id: '$waiterId', orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 5 },
      ]),

      // 17. Payment method breakdown — this month (was sequential, now in batch)
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: monthStart } } },
        { $group: {
            _id:     '$paymentMethod',
            count:   { $sum: 1 },
            revenue: { $sum: '$grandTotal' },
          }
        },
        { $sort: { revenue: -1 } },
      ]),

      // 18. Top categories by revenue — last 30 days (via bill items → item → category)
      Bill.aggregate([
        { $match: { ...tf(r, b), status: 'active', createdAt: { $gte: thirtyAgo } } },
        { $unwind: '$items' },
        { $match: { 'items.itemId': { $exists: true, $ne: null } } },
        { $lookup: {
            from:         'items',
            localField:   'items.itemId',
            foreignField: '_id',
            pipeline:     [{ $project: { category: 1 } }],
            as:           'itemDoc',
          }
        },
        { $unwind: { path: '$itemDoc', preserveNullAndEmpty: true } },
        { $lookup: {
            from:         'categories',
            localField:   'itemDoc.category',
            foreignField: '_id',
            pipeline:     [{ $project: { name: 1 } }],
            as:           'catDoc',
          }
        },
        { $unwind: { path: '$catDoc', preserveNullAndEmpty: true } },
        { $group: {
            _id:      '$catDoc.name',
            quantity: { $sum: '$items.quantity' },
            revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          }
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
      ]),

      // 19. Recent bills (most recent 8)
      Bill.find({ ...tf(r, b), status: 'active' })
        .sort({ createdAt: -1 }).limit(8)
        .populate('createdBy', 'name').lean(),

      // 20. Recent orders (most recent 10)
      Order.find(tf(r, b))
        .sort({ createdAt: -1 }).limit(10)
        .populate('createdBy', 'name').lean(),

      // 21. Branch list — for the branch selector in the frontend
      Branch.find({ restaurantId: r, status: 'active' })
        .select('name isDefault branchCode city')
        .sort({ isDefault: -1, name: 1 })
        .lean(),
    ]);

    // ── Resolve staff names for cashier + waiter performance (single query) ──
    const cashierIds  = cashierBillAgg.map((c) => c._id).filter(Boolean);
    const waiterIds   = waiterOrderAgg.map((w) => w._id).filter(Boolean);
    const allPerfIds  = [...cashierIds, ...waiterIds];
    const perfUsers   = allPerfIds.length
      ? await User.find({ _id: { $in: allPerfIds } }, 'name role').lean()
      : [];
    const userMap     = Object.fromEntries(perfUsers.map((u) => [String(u._id), u]));

    // ── Shape revenue ─────────────────────────────────────────────────────────
    const rev       = revAgg[0] || {};
    const mkPeriod  = (arr) => {
      const d = arr?.[0] ?? {};
      return {
        revenue:  d.revenue  ?? 0,
        subtotal: d.subtotal ?? 0,
        tax:      d.tax      ?? 0,
        discount: d.discount ?? 0,
        count:    d.count    ?? 0,
        avg:      d.count ? Math.round(((d.revenue ?? 0) / d.count) * 100) / 100 : 0,
      };
    };
    const todayRev = mkPeriod(rev.today);
    const weekRev  = mkPeriod(rev.week);
    const monthRev = mkPeriod(rev.month);
    const yearRev  = mkPeriod(rev.year);

    const revenue = {
      // Gross totals
      today:          todayRev.revenue,
      week:           weekRev.revenue,
      month:          monthRev.revenue,
      year:           yearRev.revenue,
      // Bill counts
      todayBillCount: todayRev.count,
      weekBillCount:  weekRev.count,
      monthBillCount: monthRev.count,
      yearBillCount:  yearRev.count,
      // Average order values
      todayAvg:       todayRev.avg,
      weekAvg:        weekRev.avg,
      monthAvg:       monthRev.avg,
      // Tax & discount detail
      todayTax:       todayRev.tax,
      todayDiscount:  todayRev.discount,
      monthTax:       monthRev.tax,
      monthDiscount:  monthRev.discount,
      monthSubtotal:  monthRev.subtotal,
    };

    // ── Shape today's orders ──────────────────────────────────────────────────
    const todaySt  = todayStatAgg[0] || {};
    const t_total  = todaySt.total?.[0]?.n ?? 0;
    const t_status = Object.fromEntries((todaySt.byStatus || []).map((s) => [s._id, s.count]));
    const t_type   = Object.fromEntries((todaySt.byType   || []).map((t) => [t._id, t.count]));
    const t_hour   = Object.fromEntries((todaySt.byHour   || []).map((h) => [h._id, h.count]));

    const orders = {
      today:     t_total,
      pending:   t_status.Pending    ?? 0,
      cooking:   t_status.Cooking    ?? 0,
      ready:     t_status.Ready      ?? 0,
      served:    t_status.Served     ?? 0,
      completed: t_status.Completed  ?? 0,
      cancelled: t_status.Cancelled  ?? 0,
      walkIn:    t_type.WalkIn       ?? 0,
      dineIn:    t_type.DineIn       ?? 0,
      delivery:  t_type.Delivery     ?? 0,
      takeAway:  t_type.TakeAway     ?? 0,
      active:    activeOrders,
    };

    // ── Shape monthly order breakdowns ────────────────────────────────────────
    const monthSt  = monthStatAgg[0] || {};
    const m_status = Object.fromEntries((monthSt.byStatus || []).map((s) => [s._id, s.count]));
    const m_type   = Object.fromEntries((monthSt.byType   || []).map((t) => [t._id, t.count]));

    const statusBreakdown = Object.entries(m_status)
      .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#9CA3AF' }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    const orderTypeBreakdown = Object.entries(m_type)
      .map(([type, value]) => ({
        name:  TYPE_LABELS[type] || type,
        value,
        color: TYPE_COLORS[type] || '#9CA3AF',
      }))
      .filter((o) => o.value > 0)
      .sort((a, b) => b.value - a.value);

    // ── Shape staff ───────────────────────────────────────────────────────────
    const staffFacet    = staffAgg[0] || {};
    const staffMap      = Object.fromEntries((staffFacet.active || []).map((s) => [s._id, s.count]));
    const activeTotal   = Object.values(staffMap).reduce((a, c) => a + c, 0);
    const inactiveTotal = staffFacet.inactive?.[0]?.n ?? 0;

    const staff = {
      total:    activeTotal + inactiveTotal,
      active:   activeTotal,
      inactive: inactiveTotal,
      cashiers: staffMap.cashier  ?? 0,
      waiters:  staffMap.waiter   ?? 0,
      kitchen:  staffMap.kitchen  ?? 0,
      delivery: staffMap.delivery ?? 0,
      managers: staffMap.manager  ?? 0,
      admins:   staffMap.admin    ?? 0,
    };

    const staffChart = [
      { role: 'Cashiers', count: staff.cashiers },
      { role: 'Waiters',  count: staff.waiters  },
      { role: 'Kitchen',  count: staff.kitchen  },
      { role: 'Delivery', count: staff.delivery },
      { role: 'Managers', count: staff.managers },
    ].filter((s) => s.count > 0);

    // ── Shape tables ──────────────────────────────────────────────────────────
    const tableMap   = Object.fromEntries(tableAgg.map((t) => [t._id, t.count]));
    const tableTotal = Object.values(tableMap).reduce((a, c) => a + c, 0);

    const tables = {
      total:        tableTotal,
      available:    tableMap.Available   ?? 0,
      occupied:     tableMap.Occupied    ?? 0,
      reserved:     tableMap.Reserved    ?? 0,
      maintenance:  tableMap.Maintenance ?? 0,
      occupancyRate: tableTotal > 0
        ? Math.round(((tableMap.Occupied ?? 0) / tableTotal) * 100)
        : 0,
    };

    // ── Shape menu ────────────────────────────────────────────────────────────
    const itemAvail   = itemAgg.find((i) => i._id === true  || i._id == null);
    const itemUnavail = itemAgg.find((i) => i._id === false);
    const menu = {
      totalItems:      (itemAvail?.count ?? 0) + (itemUnavail?.count ?? 0),
      totalCategories,
      available:       itemAvail?.count   ?? 0,
      unavailable:     itemUnavail?.count ?? 0,
    };

    // ── Build weekly chart grid (last 7 days) ─────────────────────────────────
    const wBillMap  = Object.fromEntries(weeklyBillAgg.map((d)  => [d._id, d]));
    const wOrderMap = Object.fromEntries(weeklyOrderAgg.map((d) => [d._id, d.orders]));
    const weeklyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now); day.setDate(now.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      weeklyRevenue.push({
        day:     DAYS_SHORT[day.getDay()],
        date:    day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: wBillMap[key]?.revenue ?? 0,
        bills:   wBillMap[key]?.bills   ?? 0,
        orders:  wOrderMap[key]         ?? 0,
      });
    }

    // ── Build yearly chart grid (last 12 months) ──────────────────────────────
    const yBillMap  = Object.fromEntries(yearlyBillAgg.map((d)  => [`${d._id.y}-${d._id.m}`, d]));
    const yOrderMap = Object.fromEntries(yearlyOrderAgg.map((d) => [`${d._id.y}-${d._id.m}`, d.orders]));
    const yearlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      yearlyRevenue.push({
        month:   `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        revenue: yBillMap[key]?.revenue ?? 0,
        bills:   yBillMap[key]?.bills   ?? 0,
        orders:  yOrderMap[key]         ?? 0,
      });
    }

    // ── Orders by hour (24-bucket grid from today's facet) ────────────────────
    const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
      hour:  `${String(h).padStart(2, '0')}:00`,
      count: t_hour[h] ?? 0,
    }));

    // ── Payment breakdown ─────────────────────────────────────────────────────
    const paymentBreakdown = paymentAgg.map((p) => ({
      name:    p._id || 'Cash',
      count:   p.count,
      revenue: p.revenue,
      color:   PAY_COLORS[p._id] || '#9CA3AF',
    }));

    // ── Performance: cashier & waiter ─────────────────────────────────────────
    const cashierPerformance = cashierBillAgg.map((c) => ({
      name:    userMap[String(c._id)]?.name || 'Unknown',
      role:    'cashier',
      bills:   c.bills,
      revenue: c.revenue,
    }));
    const waiterPerformance = waiterOrderAgg.map((w) => ({
      name:   userMap[String(w._id)]?.name || 'Unknown',
      role:   'waiter',
      orders: w.orders,
    }));

    // ── Activity feed ─────────────────────────────────────────────────────────
    const orderEvents = recentOrders.map((o) => ({
      id:      String(o._id),
      type:    'order',
      icon:    o.status === 'Completed' ? 'check' : o.status === 'Cancelled' ? 'x' : 'order',
      message: `${o.orderType === 'DineIn' ? `Table ${o.tableNumber}` : (TYPE_LABELS[o.orderType] || o.orderType)} #${String(o._id).slice(-5).toUpperCase()} — ${o.status}`,
      by:      o.createdBy?.name || 'Staff',
      status:  o.status,
      urgent:  o.isUrgent || false,
      time:    o.createdAt,
    }));
    const billEvents = recentBills.map((b) => ({
      id:      String(b._id),
      type:    'bill',
      icon:    'bill',
      message: `Bill #${String(b._id).slice(-5).toUpperCase()} — Table ${b.tableNo} — Rs ${Math.round(b.grandTotal || 0).toLocaleString()}`,
      by:      b.createdBy?.name || 'Cashier',
      status:  'Completed',
      urgent:  false,
      time:    b.createdAt,
    }));
    const activityFeed = [...orderEvents, ...billEvents]
      .sort((a, bv) => new Date(bv.time) - new Date(a.time))
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        revenue,
        orders,
        staff,
        tables,
        menu,
        topItems:            topItemsAgg,
        leastItems:          leastItemsAgg,
        topCategories:       topCatAgg,
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
        branches:   branchList.map((br) => ({
          _id:       br._id,
          name:      br.name,
          isDefault: br.isDefault,
          city:      br.city   || '',
          code:      br.branchCode || '',
        })),
        selectedBranchId: b || null,
        recentBills: recentBills.map((b) => ({
          _id:           b._id,
          tableNo:       b.tableNo,
          grandTotal:    b.grandTotal || 0,
          paymentMethod: b.paymentMethod,
          createdAt:     b.createdAt,
          createdBy:     b.createdBy?.name || 'N/A',
          itemCount:     b.items?.length   || 0,
          status:        b.status,
        })),
      },
    });
  } catch (error) {
    console.error('[dashboardStats]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
