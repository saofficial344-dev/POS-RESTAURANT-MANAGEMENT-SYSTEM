import Subscription from '../models/Subscription.js';
import FeatureFlag  from '../models/FeatureFlag.js';
import { getCurrentUsage } from '../services/subscriptionService.js';

// Verify the restaurant's subscription is active (not expired/suspended/cancelled)
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return next(); // no tenant = bypass (platform admin, etc.)

    const sub = await Subscription.findOne({ restaurantId });
    if (!sub) return next(); // no subscription yet = allow (grace period)

    if (['expired', 'suspended', 'cancelled'].includes(sub.status)) {
      return res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_INACTIVE',
        message: `Your subscription is ${sub.status}. Please renew to continue using this feature.`,
        status: sub.status,
      });
    }
    req.subscription = sub;
    next();
  } catch (err) {
    next(err);
  }
};

// Verify a specific feature is enabled for the restaurant's plan
export const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return next();

    const sub = await Subscription.findOne({ restaurantId }).populate('planId', 'slug features');
    if (!sub?.planId) return next(); // no plan data = allow

    const flag = await FeatureFlag.findOne({ key: featureKey, isActive: true });

    // If no feature flag exists, fall back to the Plan's feature object
    if (!flag) {
      const planFeatures = sub.planId.features || {};
      // Map featureKey to plan feature fields
      const FEATURE_MAP = {
        inventory:        'inventory',
        advancedReports:  'advancedReports',
        apiAccess:        'apiAccess',
        multiBranch:      'multiBranch',
        loyalty:          'loyalty',
        delivery:         'delivery',
        kitchenDisplay:   'kitchenDisplay',
        analytics:        'analytics',
        exportData:       'exportData',
        customDomain:     'customDomain',
        prioritySupport:  'prioritySupport',
        multipleAdmins:   'multipleAdmins',
      };
      const planKey = FEATURE_MAP[featureKey] || featureKey;
      if (planFeatures[planKey] === false) {
        return res.status(403).json({
          success: false,
          code: 'FEATURE_UNAVAILABLE',
          message: `The "${featureKey}" feature is not available on your current plan. Please upgrade.`,
          feature: featureKey,
          upgradeRequired: true,
        });
      }
      return next();
    }

    const value = flag.resolve(restaurantId, sub.planId.slug);
    if (!value) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_UNAVAILABLE',
        message: `The "${featureKey}" feature is not available on your current plan. Please upgrade.`,
        feature: featureKey,
        upgradeRequired: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Verify the restaurant hasn't exceeded a plan limit
export const requireWithinLimit = (limitKey) => async (req, res, next) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return next();

    const sub = await Subscription.findOne({ restaurantId }).populate('planId', 'limits name');
    if (!sub?.planId) return next();

    const limit = sub.planId.limits[limitKey];
    if (limit === undefined || limit < 0) return next(); // unlimited

    const usage   = await getCurrentUsage(restaurantId);
    const current = usage[limitKey] || 0;

    if (current >= limit) {
      return res.status(402).json({
        success: false,
        code: 'PLAN_LIMIT_REACHED',
        message: `You have reached the ${limitKey} limit (${limit}) for the ${sub.planId.name} plan. Please upgrade.`,
        limit,
        current,
        upgradeRequired: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
