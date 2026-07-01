import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Please provide table number'],
    unique: true,
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide seating capacity'],
    min: 1,
    max: 20,
  },
  section: {
    type: String,
    enum: ['Indoor', 'Outdoor', 'VIP', 'Bar', 'Lounge'],
    default: 'Indoor',
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved', 'Maintenance'],
    default: 'Available',
  },
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  occupiedBy: {
    numberOfGuests: Number,
    customerName: String,
    checkinTime: Date,
  },
  reservedFor: {
    customerName: String,
    customerPhone: String,
    reservationTime: Date,
    numberOfGuests: Number,
  },
  branch: {
    type: String,
    default: 'Main',
  },
  lastCleanedAt: Date,
  needsCleaning: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  notes: String,
});

TableSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const Table = mongoose.model('Table', TableSchema);

export default Table;