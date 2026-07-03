import crypto          from 'crypto';
import mongoose        from 'mongoose';
import Restaurant      from '../../models/Restaurant.js';
import Branch          from '../../models/Branch.js';
import User            from '../../models/User.js';
import Order           from '../../models/Order.js';
import Bill            from '../../models/Bill.js';
import Plan            from '../../models/Plan.js';
import Subscription    from '../../models/Subscription.js';
import UsageTracking   from '../../models/UsageTracking.js';
import FeatureFlag     from '../../models/FeatureFlag.js';
import Category        from '../../models/Category.js';
import Item            from '../../models/Item.js';
import Table           from '../../models/Table.js';
import Payment         from '../../models/Payment.js';
import Invoice         from '../../models/Invoice.js';
import Notification    from '../../models/Notification.js';
import Setting         from '../../models/Setting.js';
import ApiKey          from '../../models/ApiKey.js';
import SupportTicket   from '../../models/SupportTicket.js';
import RefreshToken    from '../../models/RefreshToken.js';
import Permission      from '../../models/Permission.js';
import PlatformAdmin   from '../../models/PlatformAdmin.js';
import { getRedisClient }              from '../../config/redis.js';
import { syncRestaurantPlan }          from '../../services/subscriptionService.js';
import { logPlatformAction }           from '../../utils/platformAudit.js';
import { disconnectRestaurantSockets } from '../../socket/index.js';

// ── POST /platform/v1/restaurants — create restaurant (platform-only) ─────────
export const createRestaurant = async (req, res) => {
  try {
    const {
      // Restaurant identity
      name, businessType = 'restaurant', ownerName = '', email = '', phone = '',
      // Location
      address = '', city = '', country = 'Pakistan', timezone = 'Asia/Karachi',
      // Financial
      currency = 'PKR', taxRate = 0,
      // Default branch
      defaultBranchName,
      // Subscription
      planSlug = 'basic', billingCycle = 'monthly', trialDays,
      subscriptionStart, subscriptionEnd,
      // Limits (optional overrides — defaults come from plan)
      maxBranches, maxUsers,
      // Feature flags (optional overrides — defaults come from plan)
      features = {},
      // Admin account
      adminName, adminEmail = '',
      // Internal
      notes = '',
    } = req.body;

    if (!name?.trim())      return res.status(400).json({ success: false, message: 'Restaurant name is required' });
    if (!adminName?.trim()) return res.status(400).json({ success: false, message: 'Admin username is required' });
    if (!planSlug)          return res.status(400).json({ success: false, message: 'Plan is required' });

    // ── Resolve plan ────────────────────────────────────────────────────────────
    const plan = await Plan.findOne({ slug: planSlug, isActive: true, isArchived: false });
    if (!plan) return res.status(400).json({ success: false, message: `Plan '${planSlug}' not found or inactive` });

    // ── Generate slug & temporary password ─────────────────────────────────────
    const baseSlug    = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniquePart  = crypto.randomBytes(3).toString('hex');
    const slug        = `${baseSlug}-${uniquePart}`;
    const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12-char alphanumeric

    // ── Compute subscription dates ──────────────────────────────────────────────
    const now           = subscriptionStart ? new Date(subscriptionStart) : new Date();
    const trialDayCount = trialDays !== undefined ? Number(trialDays) : (plan.trialDays ?? 14);
    const periodEnd     = subscriptionEnd
      ? new Date(subscriptionEnd)
      : new Date(now.getTime() + trialDayCount * 86400 * 1000);

    // ── Merge features: plan defaults + any admin overrides ────────────────────
    const resolvedFeatures = {
      multipleAdmins:    features.multipleAdmins    ?? plan.features.multipleAdmins    ?? false,
      advancedReporting: features.advancedReports   ?? plan.features.advancedReports   ?? false,
      deliveryModule:    features.delivery          ?? plan.features.delivery           ?? true,
      inventoryTracking: features.inventory         ?? plan.features.inventory          ?? false,
      loyaltyProgram:    features.loyalty           ?? plan.features.loyalty            ?? false,
      apiAccess:         features.apiAccess         ?? plan.features.apiAccess          ?? false,
      multiBranch:       features.multiBranch       ?? plan.features.multiBranch        ?? false,
      analytics:         features.analytics         ?? plan.features.analytics          ?? false,
      kitchenDisplay:    features.kitchenDisplay    ?? plan.features.kitchenDisplay     ?? true,
      exportData:        features.exportData        ?? plan.features.exportData         ?? false,
      customDomain:      features.customDomain      ?? plan.features.customDomain       ?? false,
      prioritySupport:   features.prioritySupport   ?? plan.features.prioritySupport    ?? false,
    };

    const effectiveMaxBranches = maxBranches !== undefined ? Number(maxBranches) : plan.limits.branches;
    const effectiveMaxUsers    = maxUsers    !== undefined ? Number(maxUsers)    : plan.limits.staff;

    // ── 1. Create Restaurant ────────────────────────────────────────────────────
    const restaurant = await Restaurant.create({
      name:        name.trim(),
      slug,
      email,
      phone,
      address:     { street: address, city, country },
      timezone,
      currency,
      taxRate:     Number(taxRate) || 0,
      businessType,
      ownerName,
      notes,
      plan:        plan.name,
      planStatus:  trialDayCount > 0 ? 'trial' : 'active',
      status:      'active',
      maxBranches: effectiveMaxBranches,
      maxUsers:    effectiveMaxUsers,
      features:    resolvedFeatures,
    });

    // ── 2. Create default Branch ────────────────────────────────────────────────
    const branch = await Branch.create({
      restaurantId: restaurant._id,
      name:         (defaultBranchName?.trim()) || `${name.trim()} — Main Branch`,
      isDefault:    true,
      status:       'active',
      city,
      country,
      timezone,
      currency,
    });

    // ── 3. Create admin User ────────────────────────────────────────────────────
    const adminUser = await User.create({
      restaurantId: restaurant._id,
      branchId:     branch._id,
      name:         adminName.trim(),
      email:        adminEmail || email || '',
      password:     tempPassword,
      role:         'admin',
      status:       'active',
    });

    // ── 4. Link adminId back to restaurant ──────────────────────────────────────
    restaurant.adminId = adminUser._id;
    await restaurant.save();

    // ── 5. Create Subscription ──────────────────────────────────────────────────
    const subscription = await Subscription.create({
      restaurantId:       restaurant._id,
      planId:             plan._id,
      status:             trialDayCount > 0 ? 'trial' : 'active',
      billingCycle,
      trialStart:         trialDayCount > 0 ? now : undefined,
      trialEnd:           trialDayCount > 0 ? periodEnd : undefined,
      currentPeriodStart: now,
      currentPeriodEnd:   periodEnd,
      autoRenew:          true,
      paymentProvider:    'manual',
    });

    // ── 6. Sync plan data into Restaurant denormalized fields ───────────────────
    await syncRestaurantPlan(restaurant._id, plan, subscription);

    // ── 7. Initialize UsageTracking for current period ──────────────────────────
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await UsageTracking.create({
      restaurantId: restaurant._id,
      period,
      branches: 1,
      staff:    1,
    }).catch(() => {}); // ignore if already exists

    // ── 8. Audit log ────────────────────────────────────────────────────────────
    logPlatformAction(
      req.platformAdmin, 'RESTAURANT_CREATED',
      'restaurant', restaurant._id, restaurant.name, req,
      { plan: plan.name, billingCycle, trialDays: trialDayCount, adminName: adminName.trim() }
    );

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login/admin`;

    res.status(201).json({
      success: true,
      message: `Restaurant '${restaurant.name}' created successfully`,
      data: {
        restaurant: {
          _id:          restaurant._id,
          name:         restaurant.name,
          slug:         restaurant.slug,
          email:        restaurant.email,
          businessType: restaurant.businessType,
          status:       restaurant.status,
          plan:         plan.name,
          planStatus:   subscription.status,
        },
        branch: {
          _id:  branch._id,
          name: branch.name,
        },
        subscription: {
          _id:                subscription._id,
          status:             subscription.status,
          billingCycle:       subscription.billingCycle,
          currentPeriodEnd:   subscription.currentPeriodEnd,
          trialEnd:           subscription.trialEnd,
        },
        credentials: {
          username:          adminName.trim(),
          temporaryPassword: tempPassword,
          loginUrl,
          adminEmail:        adminEmail || email || '',
          note:              'This password is shown only once. Share it securely with the restaurant owner.',
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ success: false, message: `Duplicate value for ${key} — this restaurant or username already exists` });
    }
    console.error('[createRestaurant]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /platform/v1/restaurants ─────────────────────────────────────────────
export const listRestaurants = async (req, res) => {
  try {
    const { search, status, plan, planStatus, page = 1, limit = 15 } = req.query;

    const filter = {};
    // Exclude deleted tombstones from the default listing unless the caller
    // explicitly requests them with ?status=deleted
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: 'deleted' };
    }
    if (plan)       filter.plan       = plan;
    if (planStatus) filter.planStatus = planStatus;
    if (search?.trim()) {
      const rx   = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: rx }, { slug: rx }, { email: rx }];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Restaurant.countDocuments(filter);
    const restaurants = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v');

    res.json({
      success: true,
      data: restaurants,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /platform/v1/restaurants/:id ─────────────────────────────────────────
export const getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const [branches, userCount, orderCount, revenueAgg, adminUser, subscription] = await Promise.all([
      Branch.find({ restaurantId: restaurant._id, status: { $ne: 'deleted' } }).populate('managerId', 'name email'),
      User.countDocuments({ restaurantId: restaurant._id }),
      Order.countDocuments({ restaurantId: restaurant._id }),
      Bill.aggregate([
        { $match: { restaurantId: restaurant._id, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      User.findOne({ restaurantId: restaurant._id, role: 'admin' })
        .select('name email status lastLoginAt lastLoginIp mustChangePassword createdAt'),
      Subscription.findOne({ restaurantId: restaurant._id })
        .populate('planId', 'name displayName slug price limits features trialDays')
        .select('status billingCycle currentPeriodStart currentPeriodEnd trialStart trialEnd autoRenew cancelledAt cancelReason'),
    ]);

    logPlatformAction(req.platformAdmin, 'RESTAURANT_VIEWED', 'restaurant', restaurant._id, restaurant.name, req);

    res.json({
      success: true,
      data: {
        restaurant,
        branches,
        adminUser: adminUser || null,
        subscription: subscription || null,
        stats: { userCount, orderCount, branchCount: branches.length, totalRevenue: revenueAgg[0]?.total ?? 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /platform/v1/restaurants/:id — edit basic restaurant info ───────────
export const editRestaurant = async (req, res) => {
  try {
    const EDITABLE = ['name', 'email', 'phone', 'timezone', 'currency', 'businessType', 'ownerName', 'taxRate', 'notes', 'maxBranches', 'maxUsers'];
    const updates  = {};

    EDITABLE.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Allow nested address fields
    if (req.body.address !== undefined) updates['address.street']  = req.body.address;
    if (req.body.city    !== undefined) updates['address.city']    = req.body.city;
    if (req.body.country !== undefined) updates['address.country'] = req.body.country;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    logPlatformAction(req.platformAdmin, 'RESTAURANT_UPDATED', 'restaurant', restaurant._id, restaurant.name, req, { updates });
    res.json({ success: true, message: 'Restaurant updated', data: restaurant });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate value — check name or email' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /platform/v1/restaurants/:id — PERMANENT delete (superadmin only) ──
//
// Requires:
//   body.adminPassword  — currently logged-in Platform Super Admin password ONLY.
//                         Never verifies restaurant admin credentials.
//   body.reason         — optional deletion reason for the audit log
//
// Uses sequential per-collection deletes with granular error logging so the
// exact failing collection is always surfaced. Works with standalone MongoDB
// (no replica set required) and Atlas alike.
export const deleteRestaurant = async (req, res) => {
  const { adminPassword, reason = 'Permanently deleted by platform super admin' } = req.body;

  // ── 1. Verify Platform Super Admin password (the ONLY password checked) ──────
  if (!adminPassword?.trim()) {
    return res.status(400).json({ success: false, message: 'Admin password is required to confirm deletion' });
  }

  const adminDoc = await PlatformAdmin.findById(req.platformAdmin._id).select('+password');
  if (!adminDoc) return res.status(401).json({ success: false, message: 'Admin account not found' });

  const passwordOk = await adminDoc.matchPassword(adminPassword);
  if (!passwordOk) {
    return res.status(403).json({ success: false, message: 'Incorrect Platform Administrator Password' });
  }

  // ── 2. Load the restaurant (capture name before deletion) ────────────────────
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

  const rid            = restaurant._id;
  const restaurantName = restaurant.name;
  const ridStr         = rid.toString();

  const prefix = `[DELETE:${restaurantName}]`;
  const log    = (msg) => console.log(`${prefix} ${msg}`);

  // Helper: run one delete step, log result, throw structured error on failure
  const step = async (label, fn) => {
    log(`Deleting ${label}...`);
    try {
      const result = await fn();
      const n = result?.deletedCount ?? result?.modifiedCount ?? 0;
      log(`  ✓ ${n} ${label} removed`);
      return n;
    } catch (err) {
      log(`  ✗ FAILED — ${label}`);
      log(`  Error: ${err.message}`);
      log(`  Stack: ${err.stack}`);
      const e = new Error(err.message);
      e.failedCollection = label;
      e.originalStack    = err.stack;
      throw e;
    }
  };

  // ── 3. Sequential per-collection deletion with full logging ──────────────────
  log(`Starting deletion of restaurant "${restaurantName}" (${ridStr})`);

  const summary = {};
  try {
    // Collect user _ids before deleting users (for RefreshToken cascade)
    log('Collecting user IDs for RefreshToken cascade...');
    const userIds = await User.distinct('_id', { restaurantId: rid });
    log(`  ✓ ${userIds.length} user IDs collected`);

    // Delete every restaurant-scoped collection in dependency order
    summary.notifications   = await step('Notifications',   () => Notification.deleteMany(  { restaurantId: rid }));
    summary.supportTickets  = await step('SupportTickets',  () => SupportTicket.deleteMany( { restaurantId: rid }));
    summary.apiKeys         = await step('ApiKeys',         () => ApiKey.deleteMany(         { restaurantId: rid }));
    summary.permissions     = await step('Permissions',     () => Permission.deleteMany(     { restaurantId: rid }));
    summary.usageTracking   = await step('UsageTracking',   () => UsageTracking.deleteMany(  { restaurantId: rid }));
    summary.settings        = await step('Settings',        () => Setting.deleteMany(        { restaurantId: rid }));
    summary.payments        = await step('Payments',        () => Payment.deleteMany(        { restaurantId: rid }));
    summary.invoices        = await step('Invoices',        () => Invoice.deleteMany(        { restaurantId: rid }));
    summary.subscriptions   = await step('Subscriptions',   () => Subscription.deleteMany(   { restaurantId: rid }));
    summary.bills           = await step('Bills',           () => Bill.deleteMany(           { restaurantId: rid }));
    summary.orders          = await step('Orders',          () => Order.deleteMany(          { restaurantId: rid }));
    summary.tables          = await step('Tables',          () => Table.deleteMany(          { restaurantId: rid }));
    summary.items           = await step('Items',           () => Item.deleteMany(           { restaurantId: rid }));
    summary.categories      = await step('Categories',      () => Category.deleteMany(       { restaurantId: rid }));
    summary.branches        = await step('Branches',        () => Branch.deleteMany(         { restaurantId: rid }));
    summary.users           = await step('Users',           () => User.deleteMany(           { restaurantId: rid }));

    // Cascade: RefreshTokens linked to this restaurant's users
    if (userIds.length > 0) {
      summary.refreshTokens = await step('RefreshTokens', () => RefreshToken.deleteMany({ userId: { $in: userIds } }));
    } else {
      summary.refreshTokens = 0;
      log('  Skipping RefreshTokens (no users found)');
    }

    // FeatureFlag: restaurant overrides are nested sub-documents — $pull, not deleteMany
    summary.featureFlagOverrides = await step(
      'FeatureFlag overrides',
      () => FeatureFlag.updateMany(
        { 'restaurantOverrides.restaurantId': rid },
        { $pull: { restaurantOverrides: { restaurantId: rid } } }
      )
    );

    // Force-disconnect all active Socket.IO sessions for this restaurant.
    // Done BEFORE the tombstone so clients receive the event while the socket
    // server can still resolve the room, then get disconnected.
    log('Disconnecting active Socket.IO sessions...');
    disconnectRestaurantSockets(rid);
    log('  ✓ Disconnect signal sent');

    // Tombstone the Restaurant document — do NOT hard-delete it.
    // The tombstone allows auth middleware and login to return a specific
    // "restaurant deleted" error instead of a generic "invalid credentials".
    log('Tombstoning Restaurant document...');
    await Restaurant.findByIdAndUpdate(rid, {
      status:    'deleted',
      deletedAt: new Date(),
    });
    log('  ✓ Restaurant marked as deleted');

    log(`✓ All collections cleaned. Deletion complete.`);
  } catch (err) {
    log(`ABORTED at: ${err.failedCollection || 'unknown'}`);
    return res.status(500).json({
      success:          false,
      failedCollection: err.failedCollection || 'unknown',
      error:            err.message,
      stack:            process.env.NODE_ENV !== 'production' ? err.originalStack : undefined,
    });
  }

  // ── 4. Flush Redis cache for this restaurant ─────────────────────────────────
  try {
    const redis = getRedisClient();
    if (redis) {
      const keys = await redis.keys(`*${ridStr}*`);
      if (keys.length > 0) await redis.del(...keys);
      log(`Redis: flushed ${keys.length} cache keys`);
    }
  } catch {
    log('Redis flush failed (non-critical, continuing)');
  }

  // ── 5. Audit log — only written after successful deletion ────────────────────
  logPlatformAction(
    req.platformAdmin, 'RESTAURANT_DELETED',
    'restaurant', rid, restaurantName, req,
    { reason, permanent: true, collectionsDeleted: summary }
  );

  res.json({
    success:            true,
    deletedRestaurant:  restaurantName,
    collectionsDeleted: summary,
  });
};

// ── POST /platform/v1/restaurants/:id/reset-admin-password ───────────────────
export const resetAdminPassword = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // Find the admin user for this restaurant
    const adminUser = await User.findOne({ restaurantId: restaurant._id, role: 'admin' });
    if (!adminUser) return res.status(404).json({ success: false, message: 'No admin user found for this restaurant' });

    // Generate a new temporary password (12 hex chars)
    const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Set password (pre-save hook will hash it) and mark mustChangePassword
    adminUser.password          = tempPassword;
    adminUser.mustChangePassword = true;
    adminUser.loginAttempts     = 0;
    adminUser.lockUntil         = null;
    await adminUser.save({ validateModifiedOnly: true });

    // Audit log
    logPlatformAction(req.platformAdmin, 'ADMIN_PASSWORD_RESET', 'user', adminUser._id, adminUser.name, req, {
      restaurantId: restaurant._id.toString(),
      restaurantName: restaurant.name,
    });

    res.json({
      success: true,
      message: 'Admin password reset successfully. Password is shown only once.',
      data: {
        username:          adminUser.name,
        temporaryPassword: tempPassword,
        mustChangePassword: true,
        note: 'The admin must change this password on next login.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /platform/v1/restaurants/:id/suspend ───────────────────────────────
export const suspendRestaurant = async (req, res) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (restaurant.status === 'suspended') return res.status(400).json({ message: 'Already suspended' });

    restaurant.status = 'suspended';
    await restaurant.save();

    logPlatformAction(req.platformAdmin, 'RESTAURANT_SUSPENDED', 'restaurant', restaurant._id, restaurant.name, req, { reason: reason || 'No reason provided' });
    res.json({ success: true, message: 'Restaurant suspended', data: { status: restaurant.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /platform/v1/restaurants/:id/activate ──────────────────────────────
export const activateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    restaurant.status = 'active';
    await restaurant.save();

    logPlatformAction(req.platformAdmin, 'RESTAURANT_ACTIVATED', 'restaurant', restaurant._id, restaurant.name, req);
    res.json({ success: true, message: 'Restaurant activated', data: { status: restaurant.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /platform/v1/restaurants/:id/users ───────────────────────────────────
export const listRestaurantUsers = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('name');
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const { role, status, search, page = 1, limit = 50 } = req.query;
    const filter = { restaurantId: restaurant._id };
    if (role)   filter.role   = role;
    if (status) filter.status = status;
    if (search?.trim()) {
      const rx   = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ role: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('name email role status lastLoginAt mustChangePassword createdAt branchId')
      .populate('branchId', 'name');

    res.json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /platform/v1/restaurants/:id/plan ──────────────────────────────────
export const changeRestaurantPlan = async (req, res) => {
  try {
    const { plan, planStatus } = req.body;
    if (!plan && !planStatus) return res.status(400).json({ message: 'Provide plan or planStatus' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const prev = { plan: restaurant.plan, planStatus: restaurant.planStatus };
    if (plan)       restaurant.plan       = plan;
    if (planStatus) restaurant.planStatus = planStatus;
    await restaurant.save();

    logPlatformAction(req.platformAdmin, 'RESTAURANT_PLAN_CHANGED', 'restaurant', restaurant._id, restaurant.name, req, { prev, next: { plan: restaurant.plan, planStatus: restaurant.planStatus } });
    res.json({ success: true, message: 'Plan updated', data: restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
