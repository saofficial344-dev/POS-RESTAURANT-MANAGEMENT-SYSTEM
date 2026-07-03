import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  cashTax: {
    type:    Number,
    default: 0,
  },
  cardTax: {
    type:    Number,
    default: 0,
  },
  serviceTax: {
    type:    Number,
    default: 0,
  },
  currency:      { type: String, default: 'PKR'     },
  restaurantName: { type: String, default: 'Bayroute' },
  address:        { type: String, default: '' },
  phone:          { type: String, default: '' },
}, { timestamps: true });

settingSchema.index({ restaurantId: 1 });

export default mongoose.model('Setting', settingSchema);
