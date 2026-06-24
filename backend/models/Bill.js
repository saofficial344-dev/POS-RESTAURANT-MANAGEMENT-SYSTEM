import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    tableNo: { 
      type: Number, 
      required: true 
    },
    status: {
  type: String,
  enum: ["active", "void", "revised"],
  default: "active",
},

parentBillId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Bill",
  default: null,
},

version: {
  type: Number,
  default: 1,
},
   items: [ 
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    name: String,
    price: Number,
    quantity: Number,
  },
],
    subtotal: Number,
    taxPercentage: Number,
    taxAmount: Number,
    serviceTaxPercentage: Number,
    serviceTaxAmount: Number,
    totalAmount: Number,
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
    type: String,
    enum: ["Cash", "Card"],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
    
  },
  { timestamps: true }
);

export default mongoose.model("Bill", billSchema);