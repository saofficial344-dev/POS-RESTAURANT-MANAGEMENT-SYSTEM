import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch'     },
    orderNumber: {
      type: String,
    },
    orderType: {
      type:    String,
      enum:    ['WalkIn', 'Delivery', 'DineIn', 'TakeAway'],
      default: 'WalkIn',
    },
    tableNumber:    { type: Number, default: null },
    numberOfGuests: { type: Number, default: 1    },
    customerName:   { type: String, default: 'Walk-in Customer' },
    customerPhone:  { type: String, default: null },
    deliveryAddress: {
      address: String,
      city:    String,
      phone:   String,
      notes:   String,
    },
    items: [
      {
        itemId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        itemName: String,
        quantity: { type: Number, required: true, min: 1 },
        price:    { type: Number, required: true },
        specialInstructions: String,
        status: {
          type:    String,
          enum:    ['Pending', 'Cooking', 'Ready', 'Served'],
          default: 'Pending',
        },
      },
    ],
    subtotal:        { type: Number, default: 0 },
    taxAmount:       { type: Number, default: 0 },
    deliveryCharge:  { type: Number, default: 0 },
    discount:        { type: Number, default: 0 },
    totalAmount:     { type: Number, default: 0 },
    status: {
      type:    String,
      enum:    ['Pending', 'Cooking', 'Ready', 'Served', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type:    String,
      enum:    ['Unpaid', 'Partial', 'Paid', 'Refunded'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type:    String,
      enum:    ['Cash', 'Card', 'Online', 'Wallet'],
      default: null,
    },
    amountPaid:   { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    // Staff
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    waiterId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kitchenStaffId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryRiderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Completion tracking
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Cancellation tracking
    cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancellationReason: { type: String, default: null },
    cancelledAt:        { type: Date,   default: null },
    // Kitchen timestamps
    acceptedAt:       Date,
    startedCookingAt: Date,
    readyAt:          Date,
    readyBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    servedAt:         Date,
    servedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt:      Date,
    // Order timeline — one entry per status transition
    timeline: [
      {
        status:  { type: String },
        by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        byName:  { type: String },
        at:      { type: Date, default: Date.now },
        note:    { type: String },
      },
    ],
    // Meta
    branch:    { type: String, default: 'Main' },
    notes:     String,
    isUrgent:  { type: Boolean, default: false },
    billId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  },
  { timestamps: true }
);

// Compound indexes for fast tenant-scoped queries
OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1    });
OrderSchema.index({ restaurantId: 1, branchId: 1  });
// orderNumber unique per restaurant (not globally)
OrderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true, sparse: true });
// Dashboard aggregation indexes (tenant + branch + date; status range)
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, branchId: 1, status: 1 });
OrderSchema.index({ restaurantId: 1, orderType: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, waiterId: 1, createdAt: -1 });

// Kareem 3 (Mongoose 9) does not pass next() to pre-save hooks
OrderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const filter = this.restaurantId ? { restaurantId: this.restaurantId } : {};
    const count  = await mongoose.model('Order').countDocuments(filter);
    const ts     = Date.now().toString().slice(-5);
    this.orderNumber = `ORD-${ts}-${count + 1}`;
  }
});

OrderSchema.pre('save', function () {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    this.totalAmount =
      this.subtotal + (this.taxAmount || 0) + (this.deliveryCharge || 0) - (this.discount || 0);
  }
});

export default mongoose.model('Order', OrderSchema);
