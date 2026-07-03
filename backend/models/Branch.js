import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    restaurantId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Restaurant',
      required: true,
    },

    // ── Identity ────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, 'Branch name is required'],
      trim:     true,
    },
    branchCode: {
      type:      String,
      trim:      true,
      uppercase: true,
    },

    // ── Contact ─────────────────────────────────────────────────────────────
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    // ── Address ─────────────────────────────────────────────────────────────
    address:    { type: String, trim: true },
    city:       { type: String, trim: true },
    state:      { type: String, trim: true },
    country:    { type: String, trim: true, default: 'Pakistan' },
    postalCode: { type: String, trim: true },

    // ── Locale ──────────────────────────────────────────────────────────────
    timezone: { type: String, default: 'Asia/Karachi' },
    currency: { type: String, default: 'PKR' },

    // ── Management ──────────────────────────────────────────────────────────
    managerId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    // ── Flags ───────────────────────────────────────────────────────────────
    isDefault: { type: Boolean, default: false },
    status: {
      type:    String,
      enum:    ['active', 'inactive', 'deleted'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
branchSchema.index({ restaurantId: 1 });
branchSchema.index({ restaurantId: 1, status: 1 });
// Unique name within restaurant (sparse allows null restaurantId pre-migration)
branchSchema.index({ restaurantId: 1, name: 1 }, { unique: true, sparse: true });
// Unique branchCode within restaurant
branchSchema.index(
  { restaurantId: 1, branchCode: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model('Branch', branchSchema);
