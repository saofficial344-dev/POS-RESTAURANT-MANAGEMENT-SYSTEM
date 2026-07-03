/**
 * Seed default subscription plans.
 * Run: node scripts/seedPlans.js
 * Idempotent — skips plans that already exist.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

dotenv.config();

const PLANS = [
  {
    name:        'Basic',
    slug:        'basic',
    displayName: 'Basic',
    description: 'Perfect for single-location restaurants getting started.',
    isActive:    true,
    isPublic:    true,
    sortOrder:   1,
    color:       '#6B7280',
    price:       { monthly: 0, yearly: 0, currency: 'PKR' },
    trialDays:   30,
    limits: {
      branches:          1,
      staff:             10,
      tables:            20,
      monthlyOrders:     500,
      storageGB:         1,
      apiRequestsPerDay: 0,
    },
    features: {
      inventory:       false,
      advancedReports: false,
      apiAccess:       false,
      multiBranch:     false,
      loyalty:         false,
      delivery:        true,
      kitchenDisplay:  true,
      analytics:       false,
      customDomain:    false,
      prioritySupport: false,
      multipleAdmins:  false,
      exportData:      false,
    },
  },
  {
    name:        'Advance',
    slug:        'advance',
    displayName: 'Advance',
    description: 'For growing restaurants with multiple locations.',
    isActive:    true,
    isPublic:    true,
    sortOrder:   2,
    color:       '#3B82F6',
    price:       { monthly: 4999, yearly: 49999, currency: 'PKR' },
    trialDays:   14,
    limits: {
      branches:          3,
      staff:             30,
      tables:            60,
      monthlyOrders:     5000,
      storageGB:         10,
      apiRequestsPerDay: 1000,
    },
    features: {
      inventory:       true,
      advancedReports: true,
      apiAccess:       false,
      multiBranch:     true,
      loyalty:         true,
      delivery:        true,
      kitchenDisplay:  true,
      analytics:       true,
      customDomain:    false,
      prioritySupport: false,
      multipleAdmins:  true,
      exportData:      true,
    },
  },
  {
    name:        'Premium',
    slug:        'premium',
    displayName: 'Premium',
    description: 'Enterprise-grade for restaurant chains and franchises.',
    isActive:    true,
    isPublic:    true,
    sortOrder:   3,
    color:       '#8B5CF6',
    price:       { monthly: 12999, yearly: 129999, currency: 'PKR' },
    trialDays:   14,
    limits: {
      branches:          -1, // unlimited
      staff:             -1,
      tables:            -1,
      monthlyOrders:     -1,
      storageGB:         100,
      apiRequestsPerDay: -1,
    },
    features: {
      inventory:       true,
      advancedReports: true,
      apiAccess:       true,
      multiBranch:     true,
      loyalty:         true,
      delivery:        true,
      kitchenDisplay:  true,
      analytics:       true,
      customDomain:    true,
      prioritySupport: true,
      multipleAdmins:  true,
      exportData:      true,
    },
  },
];

const DEFAULT_FLAGS = [
  { key: 'inventory',        name: 'Inventory Tracking',   category: 'operations',    description: 'Stock and inventory management module' },
  { key: 'advancedReports',  name: 'Advanced Reports',     category: 'analytics',     description: 'Detailed financial and operational reports' },
  { key: 'apiAccess',        name: 'API Access',           category: 'integrations',  description: 'External API access for integrations' },
  { key: 'multiBranch',      name: 'Multi-Branch',         category: 'operations',    description: 'Manage multiple restaurant locations' },
  { key: 'loyalty',          name: 'Loyalty Program',      category: 'operations',    description: 'Customer loyalty points and rewards' },
  { key: 'delivery',         name: 'Delivery Module',      category: 'operations',    description: 'Delivery order management and tracking' },
  { key: 'kitchenDisplay',   name: 'Kitchen Display',      category: 'operations',    description: 'KDS screen for kitchen order management' },
  { key: 'analytics',        name: 'Analytics Dashboard',  category: 'analytics',     description: 'Advanced analytics and business intelligence' },
  { key: 'customDomain',     name: 'Custom Domain',        category: 'integrations',  description: 'Map a custom domain to your restaurant portal' },
  { key: 'exportData',       name: 'Export Data',          category: 'operations',    description: 'Export orders, bills, and reports as CSV/PDF' },
  { key: 'multipleAdmins',   name: 'Multiple Admins',      category: 'security',      description: 'Add multiple admin users to manage the restaurant' },
  { key: 'prioritySupport',  name: 'Priority Support',     category: 'general',       description: 'Priority access to customer support team' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurantpos');
  console.log('Connected to MongoDB');

  // Seed plans
  for (const planData of PLANS) {
    const existing = await Plan.findOne({ slug: planData.slug });
    if (existing) {
      console.log(`  [SKIP] Plan "${planData.name}" already exists`);
    } else {
      await Plan.create(planData);
      console.log(`  [CREATE] Plan "${planData.name}" created`);
    }
  }

  // Seed feature flags
  const { default: FeatureFlag } = await import('../models/FeatureFlag.js');
  for (const flagData of DEFAULT_FLAGS) {
    const existing = await FeatureFlag.findOne({ key: flagData.key });
    if (existing) {
      console.log(`  [SKIP] Flag "${flagData.key}" already exists`);
    } else {
      // Set plan overrides based on plan features
      const planOverrides = [];
      for (const p of PLANS) {
        const value = p.features[flagData.key] ?? false;
        planOverrides.push({ planSlug: p.slug, value });
      }
      await FeatureFlag.create({ ...flagData, type: 'boolean', defaultValue: false, planOverrides });
      console.log(`  [CREATE] Flag "${flagData.key}" created`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone. Plans and feature flags seeded.');
}

run().catch(err => { console.error(err); process.exit(1); });
