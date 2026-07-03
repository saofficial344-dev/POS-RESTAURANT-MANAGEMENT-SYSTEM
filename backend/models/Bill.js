import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch'     },

    // Link back to the order that generated this bill
    orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderNumber: { type: String, default: null },

    tableNo:      { type: Number, required: true },
    customerName: { type: String, default: null },
    waiterName:   { type: String, default: null },
    waiterId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type:    String,
      enum:    ['active', 'void', 'revised'],
      default: 'active',
    },
    parentBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
    version:      { type: Number, default: 1 },

    items: [
      {
        itemId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name:     String,
        price:    Number,
        quantity: Number,
      },
    ],

    subtotal:             { type: Number, default: 0 },
    taxPercentage:        { type: Number, default: 0 },
    taxAmount:            { type: Number, default: 0 },
    serviceTaxPercentage: { type: Number, default: 0 },
    serviceTaxAmount:     { type: Number, default: 0 },
    totalAmount:          { type: Number, default: 0 },

    discountType:   { type: String, enum: ['percentage', 'fixed'] },
    discountValue:  { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },

    // Payment
    paymentStatus: {
      type:    String,
      enum:    ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Online', 'Wallet'],
    },
    transactionReference: { type: String, default: null },
    paidAt:   { type: Date, default: null },
    paidBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidByName: { type: String, default: null },

    // Timestamps from order lifecycle (denormalized for reporting)
    kitchenReadyAt: { type: Date, default: null },
    servedAt:       { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

billSchema.index({ restaurantId: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, status: 1    });
billSchema.index({ restaurantId: 1, paymentStatus: 1 });
billSchema.index({ restaurantId: 1, orderId: 1   });
// Compound indexes for dashboard aggregations (tenant + branch + status + date)
billSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, branchId: 1, status: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, paymentMethod: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, createdBy: 1, createdAt: -1 });

export default mongoose.model('Bill', billSchema);
