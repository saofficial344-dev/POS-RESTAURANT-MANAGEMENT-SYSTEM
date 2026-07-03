import mongoose from 'mongoose';

const planOverrideSchema = new mongoose.Schema({
  planSlug: { type: String, required: true },
  value:    { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const restaurantOverrideSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  value:        { type: mongoose.Schema.Types.Mixed, required: true },
  reason:       { type: String, default: '' },
  setBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  setAt:        { type: Date, default: Date.now },
}, { _id: false });

const featureFlagSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, trim: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  category:     {
    type: String,
    enum: ['billing', 'operations', 'analytics', 'integrations', 'security', 'general'],
    default: 'general',
  },
  type:         { type: String, enum: ['boolean', 'limit', 'string'], default: 'boolean' },
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: false },
  planOverrides:       [planOverrideSchema],
  restaurantOverrides: [restaurantOverrideSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// { key: 1 } unique index is declared inline via unique:true on the field above
featureFlagSchema.index({ category: 1, isActive: 1 });

// Resolve value for a specific restaurant + plan slug
featureFlagSchema.methods.resolve = function (restaurantId, planSlug) {
  // 1. Restaurant override (highest priority)
  const rid = restaurantId?.toString();
  const ro = this.restaurantOverrides.find(o => o.restaurantId?.toString() === rid);
  if (ro) return ro.value;

  // 2. Plan override
  const po = this.planOverrides.find(o => o.planSlug === planSlug);
  if (po) return po.value;

  // 3. Default
  return this.defaultValue;
};

export default mongoose.model('FeatureFlag', featureFlagSchema);
