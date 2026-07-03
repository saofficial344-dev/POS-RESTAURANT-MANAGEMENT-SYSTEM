import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  restaurantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  invoiceId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  subscriptionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'PKR' },
  status: {
    type: String,
    enum: ['pending', 'pending_review', 'approved', 'succeeded', 'failed', 'rejected', 'refunded', 'cancelled'],
    default: 'pending',
  },
  provider:          { type: String, default: 'manual' },
  externalPaymentId: { type: String },

  // Manual payment submission fields
  receiptUrl:        { type: String, default: '' },    // base64 image data or external URL
  receiptType: {
    type: String,
    enum: ['screenshot', 'bank_transfer', 'other'],
    default: 'screenshot',
  },
  submittedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submitterNotes:    { type: String, default: '' },
  referenceNumber:   { type: String, default: '' },   // bank transaction ID / cheque no.

  // Platform review fields
  approvedBy:        { type: String, default: '' },
  approvedAt:        { type: Date },
  rejectedBy:        { type: String, default: '' },
  rejectedAt:        { type: Date },
  rejectionReason:   { type: String, default: '' },
  resubmissionRequested: { type: Boolean, default: false },
  resubmissionNote:      { type: String, default: '' },

  failureReason:     { type: String },
  refundedAt:        { type: Date },
  metadata:          { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

paymentSchema.index({ restaurantId: 1, createdAt: -1 });
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model('Payment', paymentSchema);
