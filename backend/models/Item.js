import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  price:     { type: Number, required: true, min: 0 },
  category:  { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  image:     { type: String, default: "" },
  available: { type: Boolean, default: true },
  description: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Item", itemSchema);