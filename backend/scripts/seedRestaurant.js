/**
 * seedRestaurant.js — One-time migration script
 *
 * What it does:
 *  1. Creates a default Restaurant document (if none exists)
 *  2. Creates a default Branch (Main Branch)
 *  3. Stamps restaurantId + branchId onto every existing User, Order, Bill,
 *     Category, Item, Table, and Setting document
 *  4. Drops the old global unique indexes (name_1, tableNumber_1, etc.) that
 *     prevented multi-tenant operation
 *  5. Calls syncIndexes() on all models to create the new compound indexes
 *
 * Run once (after deploying the updated models):
 *   node scripts/seedRestaurant.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import models (must come after dotenv.config so env vars are available)
import Restaurant from '../models/Restaurant.js';
import Branch     from '../models/Branch.js';
import User       from '../models/User.js';
import Order      from '../models/Order.js';
import Bill       from '../models/Bill.js';
import Category   from '../models/Category.js';
import Item       from '../models/Item.js';
import Table      from '../models/Table.js';
import Setting    from '../models/Setting.js';

const dropIndex = async (collection, indexName) => {
  try {
    await mongoose.connection.collection(collection).dropIndex(indexName);
    console.log(`  ✅ Dropped index: ${collection}.${indexName}`);
  } catch (e) {
    if (e.codeName === 'IndexNotFound' || e.code === 27) {
      console.log(`  ℹ️  Index not found (already dropped): ${collection}.${indexName}`);
    } else {
      console.warn(`  ⚠️  Could not drop ${collection}.${indexName}:`, e.message);
    }
  }
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── 1. Create default Restaurant ─────────────────────────────────────────
    console.log('── Step 1: Restaurant');
    let restaurant = await Restaurant.findOne({ slug: 'default-restaurant' });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        name:       'Bayroute Restaurant',
        slug:       'default-restaurant',
        email:      '',
        phone:      '',
        status:     'active',
        plan:       'Premium',
        planStatus: 'active',
      });
      console.log(`  ✅ Created restaurant: ${restaurant.name} (${restaurant._id})`);
    } else {
      console.log(`  ℹ️  Restaurant exists: ${restaurant.name} (${restaurant._id})`);
    }
    const restaurantId = restaurant._id;

    // ── 2. Create default Branch ──────────────────────────────────────────────
    console.log('\n── Step 2: Branch');
    let branch = await Branch.findOne({ restaurantId });
    if (!branch) {
      branch = await Branch.create({
        restaurantId,
        name:      'Main Branch',
        isDefault: true,
        status:    'active',
      });
      console.log(`  ✅ Created branch: ${branch.name} (${branch._id})`);
    } else {
      console.log(`  ℹ️  Branch exists: ${branch.name} (${branch._id})`);
    }
    const branchId = branch._id;

    // ── 3. Drop old global unique indexes ─────────────────────────────────────
    console.log('\n── Step 3: Dropping old global unique indexes');
    await dropIndex('users',      'name_1');
    await dropIndex('categories', 'name_1');
    await dropIndex('tables',     'tableNumber_1');

    // ── 4. Migrate all existing documents ────────────────────────────────────
    console.log('\n── Step 4: Migrating existing documents');

    const migrations = [
      { model: User,     label: 'users',      extra: { branchId } },
      { model: Order,    label: 'orders',     extra: { branchId } },
      { model: Bill,     label: 'bills',      extra: { branchId } },
      { model: Category, label: 'categories', extra: {}           },
      { model: Item,     label: 'items',      extra: { branchId } },
      { model: Table,    label: 'tables',     extra: { branchId } },
      { model: Setting,  label: 'settings',   extra: {}           },
    ];

    for (const { model, label, extra } of migrations) {
      const result = await model.updateMany(
        { restaurantId: { $exists: false } },
        { $set: { restaurantId, ...extra } }
      );
      console.log(`  ✅ Migrated ${result.modifiedCount} ${label}`);
    }

    // ── 5. Sync indexes (creates new compound indexes) ────────────────────────
    console.log('\n── Step 5: Syncing indexes');
    const modelsToSync = [User, Order, Bill, Category, Item, Table, Setting, Branch];
    for (const model of modelsToSync) {
      await model.syncIndexes();
    }
    console.log('  ✅ All indexes synchronized');

    // ── 6. Set restaurant primary admin ──────────────────────────────────────
    console.log('\n── Step 6: Setting restaurant primary admin');
    if (!restaurant.adminId) {
      const adminUser = await User.findOne({ restaurantId, role: 'admin' });
      if (adminUser) {
        await Restaurant.findByIdAndUpdate(restaurantId, { adminId: adminUser._id });
        console.log(`  ✅ Primary admin set to: ${adminUser.name}`);
      } else {
        console.log('  ℹ️  No admin user found — skipping admin assignment');
      }
    } else {
      console.log('  ℹ️  Primary admin already set');
    }

    console.log('\n🎉 Migration complete!');
    console.log(`   Restaurant ID : ${restaurantId}`);
    console.log(`   Branch ID     : ${branchId}`);
    console.log('\n   All existing data has been assigned to the default restaurant.');
    console.log('   Log in with your existing credentials — the JWT will now include restaurantId.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
