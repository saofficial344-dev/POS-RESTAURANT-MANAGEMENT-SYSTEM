import mongoose from 'mongoose';

const platformAuditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    actorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
    actorEmail: { type: String },
    actorName:  { type: String },

    // What happened
    action: {
      type: String,
      required: true,
      enum: [
        'PLATFORM_LOGIN',
        'PLATFORM_LOGIN_FAILED',
        'PLATFORM_LOGOUT',
        'RESTAURANT_CREATED',
        'RESTAURANT_UPDATED',
        'RESTAURANT_DELETED',
        'RESTAURANT_VIEWED',
        'RESTAURANT_SUSPENDED',
        'RESTAURANT_ACTIVATED',
        'RESTAURANT_PLAN_CHANGED',
        'ADMIN_PASSWORD_RESET',
        'BRANCH_VIEWED',
        'API_KEY_CREATED',
        'API_KEY_REVOKED',
        'API_KEY_TOGGLED',
        'SUPPORT_TICKET_ASSIGNED',
        'SUPPORT_TICKET_RESOLVED',
        'PLATFORM_ADMIN_CREATED',
        'PLATFORM_SETTINGS_UPDATED',
        // Phase 5 — Subscription Engine
        'PLAN_CREATED',
        'PLAN_UPDATED',
        'PLAN_ARCHIVED',
        'SUBSCRIPTION_CHANGED',
        'SUBSCRIPTION_CANCELLED',
        'SUBSCRIPTION_REACTIVATED',
        'INVOICE_CREATED',
        'INVOICE_VOIDED',
        'INVOICE_MARKED_PAID',
        'PAYMENT_RECORDED',
        'FEATURE_FLAG_CREATED',
        'FEATURE_FLAG_UPDATED',
        'FEATURE_FLAG_OVERRIDE',
        'FEATURE_FLAG_ARCHIVED',
      ],
    },

    // What was affected
    targetType: {
      type: String,
      enum: ['restaurant', 'branch', 'user', 'api_key', 'support_ticket', 'platform', 'platform_admin', 'plan', 'subscription', 'invoice', 'payment', 'feature_flag'],
    },
    targetId:   { type: String },
    targetName: { type: String },

    // Extra context
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },

    // Request context
    ip:        { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast filtered queries
platformAuditLogSchema.index({ createdAt: -1 });
platformAuditLogSchema.index({ actorId:   1, createdAt: -1 });
platformAuditLogSchema.index({ action:    1, createdAt: -1 });
platformAuditLogSchema.index({ targetId:  1, createdAt: -1 });

export default mongoose.model('PlatformAuditLog', platformAuditLogSchema);
