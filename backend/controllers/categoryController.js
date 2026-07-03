import Category from '../models/Category.js';
import Item from '../models/Item.js';

export const createCategory = async (req, res) => {
  const { name } = req.body;
  const restaurantId = req.restaurantId || null;

  const exists = await Category.findOne({ name, restaurantId });
  if (exists) {
    return res.status(400).json({ message: 'Category exists' });
  }

  const category = await Category.create({ name, restaurantId });
  res.status(201).json(category);
};

export const getCategories = async (req, res) => {
  const categories = await Category.find({ restaurantId: req.restaurantId || null });
  res.json(categories);
};

export const updateCategory = async (req, res) => {
  const { name } = req.body;
  const restaurantId = req.restaurantId || null;

  const updated = await Category.findOneAndUpdate(
    { _id: req.params.id, restaurantId },
    { name },
    { new: true }
  );

  res.json(updated);
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || null;

    await Category.findOneAndDelete({ _id: id, restaurantId });
    await Item.deleteMany({ category: id, restaurantId });

    res.json({ message: 'Category and related items deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
