import Restaurant from '../../models/Restaurant.js';
import Branch     from '../../models/Branch.js';
import User       from '../../models/User.js';
import Order      from '../../models/Order.js';
import Bill       from '../../models/Bill.js';
import Invoice    from '../../models/Invoice.js';
import Subscription from '../../models/Subscription.js';
import Payment    from '../../models/Payment.js';

// ── GET /platform/v1/dashboard/billing ───────────────────────────────────────
export const getBillingStats = async (req, res) => {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Active subscriptions for MRR
    const activeSubsWithPlan = await Subscription.find({ status: 'active' }).populate('planId', 'price billingCycle');
    let mrr = 0;
    for (const sub of activeSubsWithPlan) {
      if (!sub.planId) continue;
      const price = sub.billingCycle === 'yearly'
        ? (sub.planId.price.yearly  || 0) / 12
        : (sub.planId.price.monthly || 0);
      mrr += price;
    }
    const arr = mrr * 12;

    // Revenue by month (last 12 months)
    const [
      monthlyRevenue,
      statusBreakdown,
      totalRevenueAgg,
      thisMonthAgg,
      thisYearAgg,
      lastMonthAgg,
      topRestaurants,
      planRevenue,
      pendingPayments,
      cancelledThisMonth,
      activeAtMonthStart,
      totalTrials,
      convertedTrials,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'approved', approvedAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { year: { $year: '$approvedAt' }, month: { $month: '$approvedAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'approved', approvedAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'approved', approvedAt: { $gte: yearStart  } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'approved', approvedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$restaurantId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
        { $unwind: { path: '$restaurant', preserveNullAndEmpty: true } },
        { $project: { restaurantName: '$restaurant.name', restaurantSlug: '$restaurant.slug', total: 1, count: 1 } },
      ]),
      Subscription.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
        { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
        { $unwind: { path: '$plan', preserveNullAndEmpty: true } },
        { $project: { planName: '$plan.displayName', planSlug: '$plan.slug', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Payment.countDocuments({ status: 'pending_review' }),
      // Churn: cancelled this month
      Subscription.countDocuments({ status: 'cancelled', cancelledAt: { $gte: monthStart } }),
      // Active at start of month (proxy: subscriptions created before monthStart that are still active or were active)
      Subscription.countDocuments({ currentPeriodStart: { $lt: monthStart }, status: { $in: ['active', 'trial', 'cancelled'] } }),
      // Total trials ever started
      Subscription.countDocuments({ trialStart: { $exists: true, $ne: null } }),
      // Converted trials (was trial, now active)
      Subscription.countDocuments({ status: 'active', trialStart: { $exists: true, $ne: null } }),
    ]);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revenueChart = monthlyRevenue.map(m => ({
      month:    `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
      revenue:  m.total,
      payments: m.count,
    }));

    // Advanced metrics
    const totalRevenue         = totalRevenueAgg[0]?.total || 0;
    const lastMonthRevenue     = lastMonthAgg[0]?.total    || 0;
    const churnRate            = activeAtMonthStart > 0
      ? Math.round((cancelledThisMonth / activeAtMonthStart) * 1000) / 10
      : 0;
    const trialConversionRate  = totalTrials > 0
      ? Math.round((convertedTrials / totalTrials) * 1000) / 10
      : 0;
    const mrrTrend             = lastMonthRevenue > 0
      ? Math.round(((mrr - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
      : 0;

    // ARPR: average revenue per paying restaurant
    const payingRestaurantIds  = await Payment.distinct('restaurantId', { status: 'approved' });
    const arpr                 = payingRestaurantIds.length > 0
      ? Math.round(totalRevenue / payingRestaurantIds.length)
      : 0;

    // Most popular plan (by active count)
    const mostPopularPlan = planRevenue[0] || null;

    res.json({
      success: true,
      data: {
        mrr:            Math.round(mrr),
        arr:            Math.round(arr),
        totalRevenue,
        thisMonthRevenue:  thisMonthAgg[0]?.total || 0,
        thisYearRevenue:   thisYearAgg[0]?.total  || 0,
        activeSubscriptions: activeSubsWithPlan.length,
        pendingPayments,
        // Advanced metrics
        churnRate,
        trialConversionRate,
        mrrTrend,
        arpr,
        mostPopularPlan,
        // Lists
        statusBreakdown:  statusBreakdown.map(s => ({ status: s._id, count: s.count })),
        planDistribution: planRevenue,
        revenueChart,
        topRestaurants,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/dashboard/stats ─────────────────────────────────────────
export const getPlatformStats = async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const NOT_DELETED = { status: { $ne: 'deleted' } };

    const [
      restaurantAgg,
      branchCount,
      userCount,
      totalOrders,
      todayOrders,
      revenueAgg,
      todayRevenueAgg,
      newRestaurantsLast30,
      recentRestaurants,
      monthlyGrowth,
      planBreakdown,
      trialBreakdown,
    ] = await Promise.all([
      Restaurant.aggregate([
        { $match: NOT_DELETED },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Branch.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Bill.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Bill.aggregate([{ $match: { status: 'active', createdAt: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Restaurant.countDocuments({ createdAt: { $gte: last30Days }, ...NOT_DELETED }),
      Restaurant.find(NOT_DELETED).sort({ createdAt: -1 }).limit(5).select('name slug plan planStatus status createdAt'),
      Restaurant.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }, ...NOT_DELETED } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Restaurant.aggregate([
        { $match: NOT_DELETED },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      Restaurant.aggregate([
        { $match: NOT_DELETED },
        { $group: { _id: '$planStatus', count: { $sum: 1 } } },
      ]),
    ]);

    const rMap        = Object.fromEntries(restaurantAgg.map((r) => [r._id, r.count]));
    const restaurants = {
      total:      Object.values(rMap).reduce((a, b) => a + b, 0),
      active:     rMap.active     || 0,
      suspended:  rMap.suspended  || 0,
      onboarding: rMap.onboarding || 0,
    };

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const growth      = monthlyGrowth.map((m) => ({
      month: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
      registrations: m.count,
    }));

    res.json({
      success: true,
      data: {
        restaurants,
        branchCount,
        userCount,
        orders:  { total: totalOrders, today: todayOrders },
        revenue: { total: revenueAgg[0]?.total ?? 0, today: todayRevenueAgg[0]?.total ?? 0 },
        newRestaurantsLast30,
        recentRestaurants,
        monthlyGrowth: growth,
        planBreakdown:  planBreakdown.map((p)  => ({ plan:   p._id, count: p.count })),
        trialBreakdown: trialBreakdown.map((t) => ({ status: t._id, count: t.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
