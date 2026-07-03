/**
 * One-time script: creates the initial platform superadmin account.
 * Run ONCE:  node scripts/seedPlatformAdmin.js
 * Change password immediately after first login.
 */
import dotenv        from 'dotenv';
import mongoose      from 'mongoose';
import PlatformAdmin from '../models/PlatformAdmin.js';

dotenv.config();

const DEFAULT_EMAIL    = 'developer@bayroute.com';
const DEFAULT_PASSWORD = 'PlatformAdmin@2026!';
const DEFAULT_NAME     = 'Platform Developer';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const existing = await PlatformAdmin.findOne({ email: DEFAULT_EMAIL });
    if (existing) {
      console.log(`Platform admin already exists: ${DEFAULT_EMAIL}`);
      process.exit(0);
    }

    await PlatformAdmin.create({
      name:     DEFAULT_NAME,
      email:    DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      role:     'superadmin',
      isActive: true,
    });

    console.log('✅ Platform superadmin created:');
    console.log(`   Email:    ${DEFAULT_EMAIL}`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log('   ⚠️  Change this password immediately after first login!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
