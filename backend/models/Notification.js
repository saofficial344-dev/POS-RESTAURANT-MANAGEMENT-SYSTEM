import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       index: true },
    role:         { type: String },
    type:         {
      type: String,
      required: true,
      enum: [
        'order:created',
        'order:status:changed',
        'order:completed',
        'order:cancelled',
        'bill:created',
        'bill:paid',
        'table:status:changed',
        'subscription:expired',
        'trial:expiring',
        'system',
      ],
    },
    title:    { type: String, required: true, maxlength: 200 },
    message:  { type: String, required: true, maxlength: 500 },
    data:     { type: mongoose.Schema.Types.Mixed },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    read:     { type: Boolean, default: false, index: true },
    readAt:   { type: Date },
    // TTL: notifications auto-delete after 7 days
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, role: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
