import jwt           from 'jsonwebtoken';
import PlatformAdmin from '../models/PlatformAdmin.js';

/**
 * Completely separate from the restaurant protect() middleware.
 * Verifies tokens signed with JWT_SECRET_PLATFORM (never JWT_SECRET).
 * Sets req.platformAdmin for downstream handlers.
 */
const platformProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Platform token required' });
  }

  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_PLATFORM);

    // Extra guard — platform tokens carry isPlatform:true to prevent
    // restaurant JWTs (signed with a different secret anyway) from leaking through
    if (!decoded.isPlatform) {
      return res.status(401).json({ message: 'Invalid platform token' });
    }

    const admin = await PlatformAdmin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Platform account not found or inactive' });
    }

    req.platformAdmin = admin;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Platform token expired',
        code:    'PLATFORM_TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ message: 'Invalid platform token' });
  }
};

// Role guard — only superadmin can perform destructive actions
export const requireSuperAdmin = (req, res, next) => {
  if (req.platformAdmin?.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Superadmin access required' });
};

export default platformProtect;
