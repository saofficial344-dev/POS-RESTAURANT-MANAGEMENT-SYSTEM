import FeatureFlag from '../../models/FeatureFlag.js';
import { logPlatformAction } from '../../utils/platformAudit.js';

export const listFlags = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category) query.category = category;
    const flags = await FeatureFlag.find(query).sort({ category: 1, key: 1 });
    res.json({ success: true, data: flags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getFlag = async (req, res) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id)
      .populate('restaurantOverrides.restaurantId', 'name slug')
      .populate('restaurantOverrides.setBy', 'name email');
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });
    res.json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createFlag = async (req, res) => {
  try {
    const flag = await FeatureFlag.create(req.body);
    logPlatformAction(req.platformAdmin, 'FEATURE_FLAG_CREATED', 'feature_flag', flag._id, flag.name, req, { key: flag.key });
    res.status(201).json({ success: true, data: flag });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'A flag with this key already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFlag = async (req, res) => {
  try {
    delete req.body.key; // key is immutable
    const flag = await FeatureFlag.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });
    logPlatformAction(req.platformAdmin, 'FEATURE_FLAG_UPDATED', 'feature_flag', flag._id, flag.name, req, req.body);
    res.json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleFlag = async (req, res) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });
    flag.isActive = !flag.isActive;
    await flag.save();
    logPlatformAction(req.platformAdmin, 'FEATURE_FLAG_UPDATED', 'feature_flag', flag._id, flag.name, req, { isActive: flag.isActive });
    res.json({ success: true, data: flag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const setRestaurantOverride = async (req, res) => {
  try {
    const { restaurantId, value, reason = '' } = req.body;
    if (!restaurantId) return res.status(400).json({ success: false, message: 'restaurantId required' });

    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });

    // Remove existing override for this restaurant, then add new one
    flag.restaurantOverrides = flag.restaurantOverrides.filter(
      o => o.restaurantId?.toString() !== restaurantId
    );
    flag.restaurantOverrides.push({
      restaurantId,
      value,
      reason,
      setBy: req.platformAdmin._id,
      setAt: new Date(),
    });
    await flag.save();

    logPlatformAction(
      req.platformAdmin, 'FEATURE_FLAG_OVERRIDE', 'feature_flag',
      flag._id, flag.name, req, { restaurantId, value, reason }
    );

    res.json({ success: true, data: flag, message: 'Override set' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeRestaurantOverride = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Feature flag not found' });

    flag.restaurantOverrides = flag.restaurantOverrides.filter(
      o => o.restaurantId?.toString() !== restaurantId
    );
    await flag.save();

    res.json({ success: true, data: flag, message: 'Override removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
