import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch'     },
  tableNumber: {
    type:     Number,
    required: [true, 'Please provide table number'],
  },
  capacity: {
    type:     Number,
    required: [true, 'Please provide seating capacity'],
    min:      1,
    max:      20,
  },
  section: {
    type:    String,
    enum:    ['Indoor', 'Outdoor', 'VIP', 'Bar', 'Lounge'],
    default: 'Indoor',
  },
  status: {
    type:    String,
    enum:    ['Available', 'Occupied', 'Reserved', 'Maintenance'],
    default: 'Available',
  },
  currentOrderId: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     'Order',
    default: null,
  },
  occupiedBy: {
    numberOfGuests: Number,
    customerName:   String,
    checkinTime:    Date,
  },
  reservedFor: {
    customerName:    String,
    customerPhone:   String,
    reservationTime: Date,
    numberOfGuests:  Number,
  },
  branch: {
    type:    String,
    default: 'Main',
  },
  lastCleanedAt: Date,
  needsCleaning: {
    type:    Boolean,
    default: false,
  },
  notes: String,
}, { timestamps: true });

// Per-restaurant unique table numbers (sparse = null restaurantId excluded)
TableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true, sparse: true });
TableSchema.index({ restaurantId: 1, status: 1 });

TableSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('Table', TableSchema);
