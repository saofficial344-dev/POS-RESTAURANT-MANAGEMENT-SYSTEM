import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const InvoiceCounter = mongoose.model('InvoiceCounter', counterSchema);

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number, required: true },
  amount:      { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber:  { type: String, unique: true },
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  planId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },

  // Why this invoice was created — essential for audit trail
  invoiceType: {
    type: String,
    enum: [
      'new_subscription',   // first paid plan
      'upgrade',            // moving to higher plan
      'downgrade',          // moving to lower plan
      'renewal',            // subscription period renewed
      'reactivation',       // cancelled/expired sub brought back
      'trial_conversion',   // trial → paid
      'platform_created',   // manually issued by platform admin
      'manual',             // catch-all
    ],
    default: 'manual',
  },

  // Complete status lifecycle
  status: {
    type: String,
    enum: ['draft', 'open', 'paid', 'void', 'uncollectible', 'cancelled', 'refunded'],
    default: 'open',
  },

  billingContact: { type: String, default: '' },

  // Financials — all amounts in the invoice currency
  subtotal:        { type: Number, default: 0 },
  discountAmount:  { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  taxPercent:      { type: Number, default: 0 },
  tax:             { type: Number, default: 0 },
  total:           { type: Number, default: 0 },
  currency:        { type: String, default: 'PKR' },

  // Key dates
  dueDate:            { type: Date },
  paidAt:             { type: Date },
  cancelledAt:        { type: Date },
  refundedAt:         { type: Date },
  sentAt:             { type: Date },

  billingPeriodStart: { type: Date },
  billingPeriodEnd:   { type: Date },

  lineItems: [lineItemSchema],

  paymentMethod: { type: String, default: 'manual' },

  // Audit chain
  createdBy:    { type: String, default: 'system' },
  approvedBy:   { type: String, default: '' },
  approvedAt:   { type: Date },
  refundReason: { type: String, default: '' },

  notes:    { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

invoiceSchema.index({ restaurantId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceType: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });   // overdue query

invoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const counter = await InvoiceCounter.findByIdAndUpdate(
      'invoice',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.invoiceNumber = `INV-${String(counter.seq).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);
