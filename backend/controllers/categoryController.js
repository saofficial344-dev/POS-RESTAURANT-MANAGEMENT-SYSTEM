import Category from "../models/Category.js";
import Item from "../models/Item.js";


export const createCategory = async (req, res) => {
  const { name } = req.body;

  const exists = await Category.findOne({ name });

  if (exists) {
    return res.status(400).json({ message: "Category exists" });
  }

  const category = await Category.create({ name });

  res.status(201).json(category);
};

export const getCategories = async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
};

export const updateCategory = async (req, res) => {
  const { name } = req.body;

  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    { name },
    { returnDocument: "after" }
  );

  res.json(updated);
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // delete category
    await Category.findByIdAndDelete(id);

    // delete related items
    await Item.deleteMany({ category: id });

    res.json({ message: "Category and related items deleted" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};