import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  name: {
    type:     String,
    required: true,
    trim:     true,
  },
}, { timestamps: true });

// Per-restaurant unique category names (sparse = null restaurantId excluded)
categorySchema.index({ restaurantId: 1, name: 1 }, { unique: true, sparse: true });

export default mongoose.model('Category', categorySchema);
