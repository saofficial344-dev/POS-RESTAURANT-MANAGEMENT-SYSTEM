import mongoose from 'mongoose';

const limitSchema = new mongoose.Schema({
  branches:          { type: Number, default: 1     },
  staff:             { type: Number, default: 10    },
  tables:            { type: Number, default: 20    },
  monthlyOrders:     { type: Number, default: 500   },
  storageGB:         { type: Number, default: 1     },
  apiRequestsPerDay: { type: Number, default: 0     },
}, { _id: false });

const featureSchema = new mongoose.Schema({
  inventory:       { type: Boolean, default: false },
  advancedReports: { type: Boolean, default: false },
  apiAccess:       { type: Boolean, default: false },
  multiBranch:     { type: Boolean, default: false },
  loyalty:         { type: Boolean, default: false },
  delivery:        { type: Boolean, default: true  },
  kitchenDisplay:  { type: Boolean, default: true  },
  analytics:       { type: Boolean, default: false },
  customDomain:    { type: Boolean, default: false },
  prioritySupport: { type: Boolean, default: false },
  multipleAdmins:  { type: Boolean, default: false },
  exportData:      { type: Boolean, default: false },
}, { _id: false });

const planSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true },
  description: { type: String, default: '' },
  isActive:    { type: Boolean, default: true  },
  isPublic:    { type: Boolean, default: true  },
  isArchived:  { type: Boolean, default: false },
  price: {
    monthly:  { type: Number, default: 0     },
    yearly:   { type: Number, default: 0     },
    currency: { type: String, default: 'PKR' },
  },
  trialDays: { type: Number, default: 14 },
  limits:    { type: limitSchema,   default: () => ({}) },
  features:  { type: featureSchema, default: () => ({}) },
  sortOrder:  { type: Number, default: 0 },
  color:      { type: String, default: '#6B7280' },
  badge:      { type: String, enum: ['', 'Popular', 'Best Value', 'New', 'Enterprise'], default: '' },
}, { timestamps: true });

// { slug: 1 } unique index is declared inline via unique:true on the field above
planSchema.index({ isActive: 1, isArchived: 1, sortOrder: 1 });

export default mongoose.model('Plan', planSchema);
