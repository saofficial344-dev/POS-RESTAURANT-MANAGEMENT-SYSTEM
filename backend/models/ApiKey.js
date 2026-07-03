import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    // null = platform-level key (not tied to a specific restaurant)
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },

    name:   { type: String, required: true, trim: true },

    // Full key hashed with bcrypt — never returned after creation
    keyHash: { type: String, required: true, select: false },

    // First 12 chars of raw key — safe to display in UI
    prefix: { type: String, required: true },

    scopes: {
      type:    [String],
      default: ['read'],
      enum:    ['read', 'write', 'orders', 'reports', 'webhooks', 'admin'],
    },

    rateLimit:  { type: Number, default: 1000 }, // requests per hour
    isActive:   { type: Boolean, default: true  },
    expiresAt:  { type: Date,    default: null   },
    lastUsedAt: { type: Date,    default: null   },
    usageCount: { type: Number,  default: 0      },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  },
  { timestamps: true }
);

apiKeySchema.index({ restaurantId: 1 });
apiKeySchema.index({ prefix:       1 });
apiKeySchema.index({ isActive:     1 });

export default mongoose.model('ApiKey', apiKeySchema);
