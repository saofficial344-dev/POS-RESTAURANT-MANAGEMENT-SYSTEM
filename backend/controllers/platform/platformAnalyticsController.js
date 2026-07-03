import Restaurant from '../../models/Restaurant.js';
import Branch     from '../../models/Branch.js';
import User       from '../../models/User.js';
import Order      from '../../models/Order.js';
import Bill       from '../../models/Bill.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── GET /platform/v1/analytics/growth ────────────────────────────────────────
// Monthly restaurant registrations + user + branch growth (last 12 months)
export const getGrowthAnalytics = async (req, res) => {
  try {
    const now    = new Date();
    const start  = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const [restaurantGrowth, userGrowth, branchGrowth] = await Promise.all([
      Restaurant.aggregate([
        { $match: { createdAt: { $gte: start }, status: { $ne: 'deleted' } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Branch.aggregate([
        { $match: { createdAt: { $gte: start }, status: { $ne: 'deleted' } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

    // Build a full 12-month grid so missing months show as 0
    const toMap = (agg) =>
      Object.fromEntries(agg.map((r) => [`${r._id.y}-${r._id.m}`, r.count]));

    const rMap = toMap(restaurantGrowth);
    const uMap = toMap(userGrowth);
    const bMap = toMap(branchGrowth);

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.unshift({
        month:         `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        restaurants:   rMap[key] || 0,
        users:         uMap[key] || 0,
        branches:      bMap[key] || 0,
      });
    }

    res.json({ success: true, data: months });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /platform/v1/analytics/revenue ───────────────────────────────────────
// Monthly platform revenue (last 12 months)
export const getRevenueAnalytics = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const monthlyRevenue = await Bill.aggregate([
      { $match: { status: 'active', createdAt: { $gte: start } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          bills:   { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);

    const rMap = Object.fromEntries(
      monthlyRevenue.map((r) => [`${r._id.y}-${r._id.m}`, { revenue: r.revenue, bills: r.bills }])
    );

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.unshift({
        month:   `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        revenue: rMap[key]?.revenue ?? 0,
        bills:   rMap[key]?.bills   ?? 0,
      });
    }

    res.json({ success: true, data: months });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /platform/v1/analytics/plans ─────────────────────────────────────────
// Plan + status distribution
export const getPlanAnalytics = async (req, res) => {
  try {
    const NOT_DELETED = { status: { $ne: 'deleted' } };
    const [planDist, statusDist, planStatusDist] = await Promise.all([
      Restaurant.aggregate([{ $match: NOT_DELETED }, { $group: { _id: '$plan',       count: { $sum: 1 } } }]),
      Restaurant.aggregate([{ $match: NOT_DELETED }, { $group: { _id: '$status',     count: { $sum: 1 } } }]),
      Restaurant.aggregate([{ $match: NOT_DELETED }, { $group: { _id: '$planStatus', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      data: {
        plans:       planDist.map((p) => ({ name: p._id || 'None', value: p.count })),
        statuses:    statusDist.map((s) => ({ name: s._id || 'None', value: s.count })),
        planStatus:  planStatusDist.map((s) => ({ name: s._id || 'None', value: s.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
