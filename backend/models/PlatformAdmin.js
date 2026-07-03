import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 min

const platformAdminSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    role: {
      type:    String,
      enum:    ['superadmin', 'developer', 'support'],
      default: 'developer',
    },
    isActive:    { type: Boolean, default: true },
    lastLoginAt: { type: Date,    default: null },
    lastLoginIp: { type: String,  default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date,   default: null },
  },
  { timestamps: true }
);

platformAdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

platformAdminSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

platformAdminSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

platformAdminSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil     = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_DURATION);
    }
  }
  await this.save({ validateModifiedOnly: true });
};

platformAdminSchema.methods.clearLoginAttempts = async function () {
  if (this.loginAttempts !== 0 || this.lockUntil !== null) {
    this.loginAttempts = 0;
    this.lockUntil     = null;
    await this.save({ validateModifiedOnly: true });
  }
};

export default mongoose.model('PlatformAdmin', platformAdminSchema);
