import Item from '../models/Item.js';
import Category from '../models/Category.js';

// CREATE
export const createItem = async (req, res) => {
  const { name, price, category, image, available, description } = req.body;
  const restaurantId = req.restaurantId || null;

  const item = await Item.create({
    restaurantId,
    name,
    price,
    category,
    image:       image       || '',
    available:   available   !== undefined ? available : true,
    description: description || '',
  });

  res.json(item);
};

// GET ALL
export const getItems = async (req, res) => {
  const restaurantId = req.restaurantId || null;

  const categories = await Category.find({ restaurantId }).select('_id');
  const validCategoryIds = categories.map((c) => c._id);

  const items = await Item.find({
    restaurantId,
    category: { $in: validCategoryIds },
  });

  res.json(items);
};

// DELETE
export const deleteItem = async (req, res) => {
  await Item.findOneAndDelete({
    _id:          req.params.id,
    restaurantId: req.restaurantId || null,
  });
  res.json({ message: 'Item deleted' });
};

// UPDATE
export const updateItem = async (req, res) => {
  const { name, price, image, available, description } = req.body;
  const updates = {};
  if (name        !== undefined) updates.name        = name;
  if (price       !== undefined) updates.price       = price;
  if (image       !== undefined) updates.image       = image;
  if (available   !== undefined) updates.available   = available;
  if (description !== undefined) updates.description = description;

  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, restaurantId: req.restaurantId || null },
    updates,
    { new: true }
  );
  res.json(item);
};
