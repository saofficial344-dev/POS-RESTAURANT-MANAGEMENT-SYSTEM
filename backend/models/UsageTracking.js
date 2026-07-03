import mongoose from 'mongoose';

const usageTrackingSchema = new mongoose.Schema({
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  period:         { type: String, required: true }, // "YYYY-MM"
  branches:       { type: Number, default: 0 },
  staff:          { type: Number, default: 0 },
  tables:         { type: Number, default: 0 },
  orders:         { type: Number, default: 0 },
  apiRequests:    { type: Number, default: 0 },
  storageGB:      { type: Number, default: 0 },
  activeSessions: { type: Number, default: 0 },
  lastUpdated:    { type: Date, default: Date.now },
}, { timestamps: true });

usageTrackingSchema.index({ restaurantId: 1, period: 1 }, { unique: true });
usageTrackingSchema.index({ restaurantId: 1, period: -1 });

export default mongoose.model('UsageTracking', usageTrackingSchema);
