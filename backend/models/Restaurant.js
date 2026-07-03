import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: {
    street:  String,
    city:    String,
    country: { type: String, default: 'Pakistan' },
  },
  logo:         { type: String, default: '' },
  businessType: { type: String, enum: ['restaurant', 'cafe', 'hotel', 'bakery', 'food_truck', 'cloud_kitchen', 'other'], default: 'restaurant' },
  ownerName:    { type: String, default: '' },
  taxRate:      { type: Number, default: 0, min: 0, max: 100 },
  notes:        { type: String, default: '' },
  currency: { type: String, default: 'PKR' },
  timezone: { type: String, default: 'Asia/Karachi' },
  plan: {
    type: String,
    default: 'Basic',
  },
  planStatus: {
    type: String,
    enum: ['active', 'trial', 'expired', 'cancelled', 'past_due', 'suspended'],
    default: 'trial',
  },
  planExpiresAt: { type: Date },
  trialEndsAt: {
    type:    Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'onboarding', 'deleted'],
    default: 'onboarding',
  },
  trialUsed:  { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
  adminId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  maxBranches: { type: Number, default: 1  },
  maxUsers:    { type: Number, default: 10 },
  features: {
    multipleAdmins:    { type: Boolean, default: false },
    advancedReporting: { type: Boolean, default: false },
    deliveryModule:    { type: Boolean, default: true  },
    inventoryTracking: { type: Boolean, default: false },
    loyaltyProgram:    { type: Boolean, default: false },
    apiAccess:         { type: Boolean, default: false },
    multiBranch:       { type: Boolean, default: false },
    analytics:         { type: Boolean, default: false },
    kitchenDisplay:    { type: Boolean, default: true  },
    exportData:        { type: Boolean, default: false },
    customDomain:      { type: Boolean, default: false },
    prioritySupport:   { type: Boolean, default: false },
  },
}, { timestamps: true });

export default mongoose.model('Restaurant', restaurantSchema);
