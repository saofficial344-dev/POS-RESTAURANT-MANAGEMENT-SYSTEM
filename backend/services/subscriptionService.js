import Subscription   from '../models/Subscription.js';
import Plan           from '../models/Plan.js';
import Restaurant     from '../models/Restaurant.js';
import UsageTracking  from '../models/UsageTracking.js';
import Branch         from '../models/Branch.js';
import User           from '../models/User.js';
import Order          from '../models/Order.js';
import Table          from '../models/Table.js';
import { emitNotification }  from '../utils/notificationEvents.js';
import { createInvoice }     from './billingService.js';

// ── Sync subscription state → Restaurant denormalized fields ──────────────────
export const syncRestaurantPlan = async (restaurantId, plan, subscription) => {
  const planStatus = (() => {
    const s = subscription.status;
    if (s === 'trial')     return 'trial';
    if (s === 'active')    return 'active';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'past_due')  return 'past_due';
    if (s === 'suspended') return 'suspended';
    return 'expired';
  })();

  await Restaurant.findByIdAndUpdate(restaurantId, {
    plan:           plan.name,
    planStatus,
    trialEndsAt:    subscription.trialEnd      || null,
    planExpiresAt:  subscription.currentPeriodEnd || null,
    maxBranches:    plan.limits.branches,
    maxUsers:       plan.limits.staff,
    subscriptionId: subscription._id,
    features: {
      multipleAdmins:    plan.features.multipleAdmins   || false,
      advancedReporting: plan.features.advancedReports  || false,
      deliveryModule:    plan.features.delivery         !== false,
      inventoryTracking: plan.features.inventory        || false,
      loyaltyProgram:    plan.features.loyalty          || false,
      apiAccess:         plan.features.apiAccess        || false,
      multiBranch:       plan.features.multiBranch      || false,
      analytics:         plan.features.analytics        || false,
      kitchenDisplay:    plan.features.kitchenDisplay   !== false,
      exportData:        plan.features.exportData       || false,
      customDomain:      plan.features.customDomain     || false,
      prioritySupport:   plan.features.prioritySupport  || false,
    },
  });
};

// ── Create initial subscription on restaurant registration ────────────────────
export const createInitialSubscription = async (restaurantId, planSlug = 'basic') => {
  const plan = await Plan.findOne({ slug: planSlug, isActive: true });
  if (!plan) {
    console.warn(`[Subscription] Plan '${planSlug}' not found — skipping subscription creation`);
    return null;
  }

  const now      = new Date();
  const trialEnd = new Date(now.getTime() + plan.trialDays * 86400 * 1000);

  const subscription = await Subscription.create({
    restaurantId,
    planId:             plan._id,
    status:             'trial',
    billingCycle:       'monthly',
    trialStart:         now,
    trialEnd,
    currentPeriodStart: now,
    currentPeriodEnd:   trialEnd,
    autoRenew:          true,
    paymentProvider:    process.env.PAYMENT_PROVIDER || 'manual',
  });

  await syncRestaurantPlan(restaurantId, plan, subscription);
  return subscription;
};

// ── Change plan (upgrade / downgrade) ────────────────────────────────────────
export const changePlan = async (restaurantId, newPlanSlug, options = {}) => {
  const {
    billingCycle = 'monthly',
    reason       = '',
    adminName    = 'system',
    skipInvoice  = false,
    metadata     = {},
  } = options;

  const [restaurant, subscription, newPlan] = await Promise.all([
    Restaurant.findById(restaurantId),
    Subscription.findOne({ restaurantId }).populate('planId'),
    Plan.findOne({ slug: newPlanSlug, isActive: true, isArchived: false }),
  ]);

  if (!restaurant) throw new Error('Restaurant not found');
  if (!newPlan)    throw new Error(`Plan '${newPlanSlug}' not found or inactive`);

  const oldPlan     = subscription?.planId;
  const now         = new Date();
  const periodEnd   = new Date(now);
  if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else                            periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Determine change type for invoice classification
  const oldPrice = oldPlan
    ? (billingCycle === 'yearly' ? oldPlan.price.yearly : oldPlan.price.monthly)
    : 0;
  const newPrice = billingCycle === 'yearly' ? newPlan.price.yearly : newPlan.price.monthly;
  const invoiceType = !oldPlan
    ? 'new_subscription'
    : subscription?.status === 'trial' && newPrice > 0
      ? 'trial_conversion'
      : newPrice >= oldPrice
        ? 'upgrade'
        : 'downgrade';

  let sub;
  if (!subscription) {
    sub = await Subscription.create({
      restaurantId,
      planId:             newPlan._id,
      status:             'active',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd:   periodEnd,
      autoRenew:          true,
      paymentProvider:    process.env.PAYMENT_PROVIDER || 'manual',
    });
  } else {
    subscription.previousPlanId     = subscription.planId;
    subscription.planId             = newPlan._id;
    subscription.status             = 'active';
    subscription.billingCycle       = billingCycle;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd   = periodEnd;
    subscription.cancelledAt        = undefined;
    subscription.cancelReason       = undefined;
    sub = await subscription.save();
  }

  await syncRestaurantPlan(restaurantId, newPlan, sub);

  let invoice = null;
  if (newPrice > 0 && !skipInvoice) {
    invoice = await createInvoice({
      restaurantId,
      subscriptionId: sub._id,
      plan:           newPlan,
      billingCycle,
      invoiceType,
      periodStart:    now,
      periodEnd,
      createdBy:      adminName,
      restaurantName: restaurant.name,
      metadata,
    });
  }

  emitNotification('plan_changed', {
    restaurantId:   restaurantId.toString(),
    restaurantName: restaurant.name,
    oldPlan:        oldPlan?.displayName || 'None',
    newPlan:        newPlan.displayName,
    changeType:     invoiceType,
    invoiceNumber:  invoice?.invoiceNumber,
    amount:         invoice?.total,
    currency:       invoice?.currency,
  });

  return { subscription: sub, invoice };
};

// ── Cancel subscription ────────────────────────────────────────────────────────
export const cancelSubscription = async (restaurantId, reason = '') => {
  const subscription = await Subscription.findOne({ restaurantId });
  if (!subscription) throw new Error('No subscription found');

  subscription.status       = 'cancelled';
  subscription.cancelledAt  = new Date();
  subscription.cancelReason = reason;
  subscription.autoRenew    = false;
  await subscription.save();

  await Restaurant.findByIdAndUpdate(restaurantId, { planStatus: 'cancelled' });

  const restaurant = await Restaurant.findById(restaurantId).select('name');
  emitNotification('subscription_cancelled', {
    restaurantId:   restaurantId.toString(),
    restaurantName: restaurant?.name,
    reason,
  });

  return subscription;
};

// ── Reactivate a cancelled/expired subscription ───────────────────────────────
export const reactivateSubscription = async (restaurantId, options = {}) => {
  const { adminName = 'system' } = options;

  const [subscription, restaurant] = await Promise.all([
    Subscription.findOne({ restaurantId }).populate('planId'),
    Restaurant.findById(restaurantId).select('name'),
  ]);
  if (!subscription) throw new Error('No subscription found');

  const now       = new Date();
  const periodEnd = new Date(now);
  if (subscription.billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else                                         periodEnd.setMonth(periodEnd.getMonth() + 1);

  subscription.status             = 'active';
  subscription.cancelledAt        = undefined;
  subscription.cancelReason       = undefined;
  subscription.currentPeriodStart = now;
  subscription.currentPeriodEnd   = periodEnd;
  subscription.autoRenew          = true;
  await subscription.save();

  await syncRestaurantPlan(restaurantId, subscription.planId, subscription);

  // Generate reactivation invoice so billing history is complete
  const plan  = subscription.planId;
  const price = subscription.billingCycle === 'yearly'
    ? plan.price.yearly
    : plan.price.monthly;

  let invoice = null;
  if (price > 0) {
    invoice = await createInvoice({
      restaurantId,
      subscriptionId: subscription._id,
      plan,
      billingCycle:   subscription.billingCycle,
      invoiceType:    'reactivation',
      periodStart:    now,
      periodEnd,
      createdBy:      adminName,
      restaurantName: restaurant?.name,
    });
  }

  emitNotification('subscription_activated', {
    restaurantId:   restaurantId.toString(),
    restaurantName: restaurant?.name,
    planName:       plan.displayName,
    billingCycle:   subscription.billingCycle,
    periodEnd,
  });

  return { subscription, invoice };
};

// ── Compute current usage for a restaurant ────────────────────────────────────
export const getCurrentUsage = async (restaurantId) => {
  const period     = new Date().toISOString().slice(0, 7);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [branches, staff, orders, tables] = await Promise.all([
    Branch.countDocuments({ restaurantId, status: { $ne: 'deleted' } }),
    User.countDocuments({ restaurantId, status: 'active' }),
    Order.countDocuments({ restaurantId, createdAt: { $gte: monthStart } }),
    Table.countDocuments({ restaurantId }),
  ]);

  const usage = await UsageTracking.findOneAndUpdate(
    { restaurantId, period },
    { $set: { branches, staff, tables, orders, lastUpdated: new Date() } },
    { upsert: true, new: true }
  );

  return usage;
};

// ── Check whether restaurant is within a specific plan limit ──────────────────
export const checkLimit = async (restaurantId, limitKey) => {
  const subscription = await Subscription.findOne({ restaurantId }).populate('planId');
  if (!subscription?.planId) return { allowed: true, current: 0, limit: Infinity };

  const plan  = subscription.planId;
  const limit = plan.limits[limitKey];
  if (limit === undefined || limit < 0) return { allowed: true, current: 0, limit: Infinity };

  const usage   = await getCurrentUsage(restaurantId);
  const current = usage[limitKey] || 0;

  return {
    allowed:   current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
};

// ── Mark overdue trial subscriptions as expired ────────────────────────────────
export const expireTrials = async () => {
  const now     = new Date();
  const expired = await Subscription.find({ status: 'trial', trialEnd: { $lt: now } });

  for (const sub of expired) {
    sub.status = 'expired';
    await sub.save();
    await Restaurant.findByIdAndUpdate(sub.restaurantId, { planStatus: 'expired', trialUsed: true });
    const r = await Restaurant.findById(sub.restaurantId).select('name');
    emitNotification('trial_expired', {
      restaurantId:   sub.restaurantId.toString(),
      restaurantName: r?.name,
    });
  }
  return expired.length;
};

// ── Mark active subscriptions past period end as past_due ─────────────────────
export const expirePastDue = async () => {
  const now     = new Date();
  const overdue = await Subscription.find({
    status:           'active',
    currentPeriodEnd: { $lt: now },
  });

  let count = 0;
  for (const sub of overdue) {
    sub.status = 'past_due';
    await sub.save();
    await Restaurant.findByIdAndUpdate(sub.restaurantId, { planStatus: 'past_due' });
    const r = await Restaurant.findById(sub.restaurantId).select('name');
    emitNotification('subscription_past_due', {
      restaurantId:   sub.restaurantId.toString(),
      restaurantName: r?.name,
      periodEnd:      sub.currentPeriodEnd,
    });
    count++;
  }
  return count;
};

// ── Suspend subscriptions that have been past_due for 30+ days ───────────────
export const suspendPastDue = async () => {
  const now          = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);

  const toSuspend = await Subscription.find({
    status:           'past_due',
    currentPeriodEnd: { $lt: thirtyDaysAgo },
  });

  let count = 0;
  for (const sub of toSuspend) {
    sub.status = 'suspended';
    await sub.save();
    await Restaurant.findByIdAndUpdate(sub.restaurantId, {
      planStatus: 'suspended',
      status:     'suspended',
    });
    const r = await Restaurant.findById(sub.restaurantId).select('name');
    emitNotification('subscription_suspended', {
      restaurantId:   sub.restaurantId.toString(),
      restaurantName: r?.name,
    });
    count++;
  }
  return count;
};

// ── Emit renewal reminders for subscriptions expiring within 7 days ───────────
export const sendRenewalReminders = async () => {
  const now       = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86400 * 1000);

  const upcoming = await Subscription.find({
    status:           'active',
    currentPeriodEnd: { $gte: now, $lte: sevenDays },
  });

  let count = 0;
  for (const sub of upcoming) {
    const r        = await Restaurant.findById(sub.restaurantId).select('name email');
    const daysLeft = Math.max(1, Math.ceil((sub.currentPeriodEnd - now) / 86400000));
    emitNotification('renewal_reminder', {
      restaurantId:   sub.restaurantId.toString(),
      restaurantName: r?.name,
      daysLeft,
      periodEnd:      sub.currentPeriodEnd,
    });
    count++;
  }
  return count;
};
