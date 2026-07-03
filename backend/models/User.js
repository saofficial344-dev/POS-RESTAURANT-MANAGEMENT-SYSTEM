import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const VALID_ROLES = [
  'admin',
  'manager',
  'cashier',
  'kitchen',
  'waiter',
  'delivery',
];

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS   = 15 * 60 * 1000; // 15 minutes

const userSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Restaurant',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Branch',
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
    },
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    role: {
      type:     String,
      enum:     VALID_ROLES,
      required: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    status: {
      type:    String,
      enum:    ['active', 'inactive'],
      default: 'active',
    },
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date,   default: null },
    lastLoginAt:   { type: Date,   default: null },
    lastLoginIp:   { type: String, default: null },

    // Password reset (select: false — never leaked in responses)
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },

    // Force password change on next login (set by platform when resetting temp password)
    mustChangePassword: { type: Boolean, default: false },

    // Rolling window of last 10 security events
    securityEvents: [
      {
        type:      { type: String },
        ip:        { type: String, default: '' },
        userAgent: { type: String, default: '' },
        at:        { type: Date,   default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Per-restaurant name uniqueness (sparse so null restaurantId docs are excluded
// from uniqueness enforcement during the pre-migration window)
userSchema.index({ restaurantId: 1, name: 1 }, { unique: true, sparse: true });
userSchema.index({ restaurantId: 1, role: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function () {
  // If previous lock has expired, reset the counter
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil     = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
  }
  await this.save({ validateModifiedOnly: true });
};

userSchema.methods.clearLoginAttempts = async function () {
  if (this.loginAttempts !== 0 || this.lockUntil !== null) {
    this.loginAttempts = 0;
    this.lockUntil     = null;
    await this.save({ validateModifiedOnly: true });
  }
};

// Append a security event (cap at 10 most recent)
userSchema.methods.logSecurityEvent = async function (type, ip = '', userAgent = '') {
  this.securityEvents.push({ type, ip, userAgent, at: new Date() });
  if (this.securityEvents.length > 10) this.securityEvents.shift();
  await this.save({ validateModifiedOnly: true });
};

export default mongoose.model('User', userSchema);
