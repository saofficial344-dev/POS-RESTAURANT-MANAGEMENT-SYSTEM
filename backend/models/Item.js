import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch'     },
  name:      { type: String,  required: true, trim: true },
  price:     { type: Number,  required: true, min: 0 },
  category:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image:     { type: String,  default: '' },
  available: { type: Boolean, default: true },
  description: { type: String, default: '' },
}, { timestamps: true });

itemSchema.index({ restaurantId: 1, category: 1 });
itemSchema.index({ restaurantId: 1, available: 1 });

export default mongoose.model('Item', itemSchema);
