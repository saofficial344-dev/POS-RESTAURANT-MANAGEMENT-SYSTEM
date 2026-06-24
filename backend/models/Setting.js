import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
  cashTax: {
    type: Number,
    default: 0,
  },

  cardTax: {
    type: Number,
    default: 0,
  },
  serviceTax: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model(
  "Setting",
  settingSchema
); 