import Item from "../models/Item.js";
import Category from "../models/Category.js";

// ➕ CREATE
export const createItem = async (req, res) => {
  const { name, price, category, image, available, description } = req.body;

  const item = await Item.create({
    name,
    price,
    category,
    image: image || '',
    available: available !== undefined ? available : true,
    description: description || '',
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
  const { name, price, image, available, description } = req.body;
  const updates = {};
  if (name !== undefined)        updates.name = name;
  if (price !== undefined)       updates.price = price;
  if (image !== undefined)       updates.image = image;
  if (available !== undefined)   updates.available = available;
  if (description !== undefined) updates.description = description;

  const item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(item);
};