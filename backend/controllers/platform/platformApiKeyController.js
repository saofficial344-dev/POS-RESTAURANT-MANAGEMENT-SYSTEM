import crypto  from 'crypto';
import bcrypt  from 'bcryptjs';
import ApiKey  from '../../models/ApiKey.js';
import { logPlatformAction } from '../../utils/platformAudit.js';

// ── GET /platform/v1/api-keys ─────────────────────────────────────────────────
export const listApiKeys = async (req, res) => {
  try {
    const { restaurantId, isActive } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const keys = await ApiKey.find(filter)
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name slug')
      .populate('createdBy',    'name email');

    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /platform/v1/api-keys ────────────────────────────────────────────────
export const createApiKey = async (req, res) => {
  try {
    const { name, restaurantId, scopes, rateLimit, expiresAt } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Key name is required' });
    }

    // Generate: plt_ + 48 random hex chars = 52-char key
    const rawKey  = `plt_${crypto.randomBytes(24).toString('hex')}`;
    const prefix  = rawKey.slice(0, 12);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await ApiKey.create({
      name:         name.trim(),
      restaurantId: restaurantId || null,
      keyHash,
      prefix,
      scopes:    scopes    || ['read'],
      rateLimit: rateLimit || 1000,
      expiresAt: expiresAt || null,
      createdBy: req.platformAdmin._id,
    });

    logPlatformAction(
      req.platformAdmin, 'API_KEY_CREATED', 'api_key', apiKey._id, name, req,
      { prefix, restaurantId: restaurantId || 'platform-wide' }
    );

    // Return the raw key ONCE — never again retrievable
    res.status(201).json({
      success: true,
      message: 'API key created. Copy the key now — it will not be shown again.',
      data: {
        _id:    apiKey._id,
        name:   apiKey.name,
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        key:    rawKey,       // only returned on creation
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /platform/v1/api-keys/:id/toggle ───────────────────────────────────
export const toggleApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) return res.status(404).json({ message: 'API key not found' });

    apiKey.isActive = !apiKey.isActive;
    await apiKey.save();

    logPlatformAction(
      req.platformAdmin, 'API_KEY_TOGGLED', 'api_key', apiKey._id, apiKey.name, req,
      { isActive: apiKey.isActive }
    );

    res.json({
      success: true,
      message: `API key ${apiKey.isActive ? 'enabled' : 'disabled'}`,
      data:    { _id: apiKey._id, isActive: apiKey.isActive },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /platform/v1/api-keys/:id ─────────────────────────────────────────
export const revokeApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) return res.status(404).json({ message: 'API key not found' });

    logPlatformAction(
      req.platformAdmin, 'API_KEY_REVOKED', 'api_key', apiKey._id, apiKey.name, req
    );

    await apiKey.deleteOne();
    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
