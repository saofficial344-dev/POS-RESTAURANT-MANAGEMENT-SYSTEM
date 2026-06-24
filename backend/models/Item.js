import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
});

export default mongoose.model("Item", itemSchema);