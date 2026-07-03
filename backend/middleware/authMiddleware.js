import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';

const RESTAURANT_DELETED_MESSAGE =
  'This restaurant has been permanently deleted. Please contact the service provider for assistance.';

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }

  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Embed tenant context from JWT — avoids an extra DB call per request
    req.restaurantId = decoded.restaurantId || null;
    req.branchId     = decoded.branchId     || null;

    // ── Restaurant existence + deletion check ─────────────────────────────────
    // Must run before user hydration so a deleted restaurant is rejected even if
    // the user document was somehow retained.
    if (req.restaurantId) {
      const restaurant = await Restaurant.findById(req.restaurantId).select('status').lean();
      if (!restaurant || restaurant.status === 'deleted') {
        return res.status(403).json({
          message: RESTAURANT_DELETED_MESSAGE,
          code: 'RESTAURANT_DELETED',
        });
      }
    }

    // Still hydrate req.user for controllers that need name, email, status, etc.
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (req.user.status === 'inactive') {
      return res.status(403).json({ message: 'Account is inactive. Contact your administrator.' });
    }

    // Force password change — block all routes except the change-password endpoint
    if (req.user.mustChangePassword && !req.skipMustChange) {
      return res.status(403).json({
        message: 'You must change your password before continuing.',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Not authorized' });
  }
};

export default protect;
