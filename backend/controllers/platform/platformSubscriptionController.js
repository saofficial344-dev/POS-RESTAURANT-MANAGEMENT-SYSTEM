import Subscription  from '../../models/Subscription.js';
import Restaurant    from '../../models/Restaurant.js';
import Plan          from '../../models/Plan.js';
import { changePlan, cancelSubscription, reactivateSubscription } from '../../services/subscriptionService.js';
import { logPlatformAction } from '../../utils/platformAudit.js';

export const listSubscriptions = async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build restaurant filter for search
    let restaurantIds;
    if (search) {
      const rests = await Restaurant.find({
        status: { $ne: 'deleted' },
        $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      restaurantIds = rests.map(r => r._id);
    }

    const query = {};
    if (status)        query.status = status;
    if (restaurantIds) query.restaurantId = { $in: restaurantIds };

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('restaurantId', 'name email slug status')
        .populate('planId', 'name displayName slug price')
        .populate('previousPlanId', 'name displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Subscription.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: subscriptions,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id)
      .populate('restaurantId', 'name email slug status plan planStatus')
      .populate('planId')
      .populate('previousPlanId', 'name displayName')
      .populate('lastInvoiceId', 'invoiceNumber total status dueDate');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const platformChangePlan = async (req, res) => {
  try {
    const { planSlug, billingCycle = 'monthly', reason = '' } = req.body;
    if (!planSlug) return res.status(400).json({ success: false, message: 'planSlug required' });

    const sub = await Subscription.findById(req.params.id).populate('restaurantId');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const adminName = req.platformAdmin?.admin?.name || 'Platform Admin';

    const { subscription, invoice } = await changePlan(
      sub.restaurantId._id,
      planSlug,
      {
        billingCycle,
        reason,
        adminName,
        metadata: { targetPlanSlug: planSlug, billingCycle, source: 'platform_admin' },
      }
    );

    logPlatformAction(
      req.platformAdmin, 'SUBSCRIPTION_CHANGED', 'subscription',
      subscription._id, sub.restaurantId.name, req,
      { newPlan: planSlug, billingCycle, reason }
    );

    res.json({ success: true, data: { subscription, invoice } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const platformCancelSubscription = async (req, res) => {
  try {
    const { reason = 'Cancelled by platform admin' } = req.body;
    const sub = await Subscription.findById(req.params.id).populate('restaurantId', 'name');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const cancelled = await cancelSubscription(sub.restaurantId._id, reason);

    logPlatformAction(
      req.platformAdmin, 'SUBSCRIPTION_CANCELLED', 'subscription',
      sub._id, sub.restaurantId.name, req, { reason }
    );

    res.json({ success: true, data: cancelled, message: 'Subscription cancelled' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const platformReactivateSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate('restaurantId', 'name');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const adminName = req.platformAdmin?.admin?.name || 'Platform Admin';
    const reactivated = await reactivateSubscription(sub.restaurantId._id, { adminName });

    logPlatformAction(
      req.platformAdmin, 'SUBSCRIPTION_REACTIVATED', 'subscription',
      sub._id, sub.restaurantId.name, req
    );

    res.json({ success: true, data: reactivated, message: 'Subscription reactivated' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
