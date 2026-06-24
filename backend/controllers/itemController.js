import Item from "../models/Item.js";
import Category from "../models/Category.js";

// ➕ CREATE
export const createItem = async (req, res) => {
  const { name, price, category } = req.body;

  const item = await Item.create({
    name,
    price,
    category,
  });

  res.json(item);
};

// 📥 GET ALL
export const getItems = async (req, res) => {
  const categories = await Category.find().select("_id");

  const validCategoryIds = categories.map((c) => c._id);

  const items = await Item.find({
    category: { $in: validCategoryIds },
  });

  res.json(items);
};

// 🗑 DELETE
export const deleteItem = async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: "Item deleted" });
};

// ✏️ UPDATE
export const updateItem = async (req, res) => {
  const { name, price } = req.body;

  const item = await Item.findByIdAndUpdate(
    req.params.id,
    { name, price },
    { returnDocument: "after" }
  );

  res.json(item);
};