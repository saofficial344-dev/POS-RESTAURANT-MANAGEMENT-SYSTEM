import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
  planId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  previousPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
  status: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'cancelled', 'expired', 'suspended'],
    default: 'trial',
  },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  currentPeriodStart: { type: Date },
  currentPeriodEnd:   { type: Date },
  trialStart: { type: Date },
  trialEnd:   { type: Date },
  cancelledAt:   { type: Date },
  cancelReason:  { type: String },
  autoRenew:     { type: Boolean, default: true },
  paymentProvider: {
    type: String,
    enum: ['manual', 'stripe', 'paddle', 'lemon_squeezy', 'paypal'],
    default: 'manual',
  },
  externalSubscriptionId: { type: String },
  lastInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// { restaurantId: 1 } unique index is declared inline via unique:true on the field above
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ trialEnd: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
