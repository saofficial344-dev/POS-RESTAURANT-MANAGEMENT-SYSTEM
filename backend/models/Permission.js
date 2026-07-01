import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema({
  roleName: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'Manager', 'Cashier', 'Waiter', 'Kitchen'],
    required: [true, 'Please provide role name'],
    unique: true,
  },
  permissions: {
    employees: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      changeRole: { type: Boolean, default: false },
      resetPassword: { type: Boolean, default: false },
    },
    menu: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    categories: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    orders: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      viewStatus: { type: Boolean, default: false },
      updateStatus: { type: Boolean, default: false },
    },
    bills: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      print: { type: Boolean, default: false },
    },
    payment: {
      view: { type: Boolean, default: false },
      process: { type: Boolean, default: false },
      refund: { type: Boolean, default: false },
    },
    tables: {
      view: { type: Boolean, default: false },
      manage: { type: Boolean, default: false },
      assign: { type: Boolean, default: false },
    },
    reports: {
      view: { type: Boolean, default: false },
      sales: { type: Boolean, default: false },
      inventory: { type: Boolean, default: false },
      employees: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
    },
    settings: {
      view: { type: Boolean, default: false },
      manage: { type: Boolean, default: false },
      taxes: { type: Boolean, default: false },
      branches: { type: Boolean, default: false },
    },
    dashboard: {
      view: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
    },
    pos: {
      access: { type: Boolean, default: false },
      processPayment: { type: Boolean, default: false },
    },
    kitchen: {
      viewOrders: { type: Boolean, default: false },
      updateStatus: { type: Boolean, default: false },
    },
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

PermissionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const Permission = mongoose.model('Permission', PermissionSchema);

export default Permission;