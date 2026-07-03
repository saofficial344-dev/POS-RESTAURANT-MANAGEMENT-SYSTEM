import User, { VALID_ROLES } from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import RefreshToken from '../models/RefreshToken.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Token helpers ─────────────────────────────────────────────────────────────

const signAccessToken = (user) =>
  jwt.sign(
    {
      id:           user._id,
      restaurantId: user.restaurantId || null,
      branchId:     user.branchId     || null,
      role:         user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

const createRefreshToken = async (userId, ipAddress = '', userAgent = '') => {
  const raw       = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await RefreshToken.create({ userId, token: raw, expiresAt, ipAddress, userAgent });
  return raw;
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Protected (admin) — creates a new staff account within the same restaurant
export const registerUser = async (req, res) => {
  try {
    const { name, password, role, email, branch } = req.body;

    if (!name || !password || !role) {
      return res
        .status(400)
        .json({ message: 'Name, password and role are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const restaurantId = req.restaurantId || null;

    const userExists = await User.findOne({ name, restaurantId });
    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      restaurantId,
      name,
      password,
      role,
      email,
      branch,
    });

    res.status(201).json({
      _id:    user._id,
      name:   user.name,
      role:   user.role,
      email:  user.email,
      branch: user.branch,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { name, password, restaurantSlug } = req.body;

    if (!name || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const DELETED_MSG = 'This restaurant no longer exists or its account has been permanently deleted. Please contact the service provider for assistance.';

    // Resolve restaurantId from slug when provided, otherwise search by name only
    let restaurantId = null;
    if (restaurantSlug?.trim()) {
      const restaurant = await Restaurant.findOne({
        slug: restaurantSlug.trim().toLowerCase(),
      }).select('_id status');
      if (!restaurant) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (restaurant.status === 'deleted') {
        return res.status(403).json({ message: DELETED_MSG, code: 'RESTAURANT_DELETED' });
      }
      restaurantId = restaurant._id;
    }

    const nameQuery = restaurantId ? { name, restaurantId } : { name };
    const matches = await User.find(nameQuery)
      .select('+password +loginAttempts +lockUntil')
      .limit(2);

    if (matches.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Same username exists in multiple restaurants — require workspace code
    if (matches.length > 1) {
      return res.status(409).json({
        message: 'Multiple accounts found with this username. Please enter your Workspace Code.',
        requiresWorkspace: true,
      });
    }

    const user = matches[0];

    // Verify restaurant still exists and has not been deleted (no-slug path)
    if (!restaurantId && user.restaurantId) {
      const r = await Restaurant.findById(user.restaurantId).select('status').lean();
      if (!r || r.status === 'deleted') {
        return res.status(403).json({ message: DELETED_MSG, code: 'RESTAURANT_DELETED' });
      }
    }

    // Account lockout check
    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        lockedUntil: user.lockUntil,
      });
    }

    if (user.status === 'inactive') {
      return res
        .status(403)
        .json({ message: 'Account is inactive. Contact your administrator.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      const remaining = Math.max(0, 5 - user.loginAttempts);
      return res.status(401).json({
        message:
          remaining > 0
            ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Account locked due to too many failed attempts.',
      });
    }

    await user.clearLoginAttempts();

    // Detect suspicious login: IP changed since last login
    const prevIp = user.lastLoginIp;
    const currentIp = req.ip;
    const suspiciousLogin = Boolean(prevIp && prevIp !== currentIp);

    user.lastLoginAt = new Date();
    user.lastLoginIp = currentIp;
    await user.save({ validateModifiedOnly: true });

    const eventType = suspiciousLogin ? 'LOGIN_SUSPICIOUS' : 'LOGIN_SUCCESS';
    user.logSecurityEvent(eventType, currentIp, req.headers['user-agent'] || '').catch(() => {});

    const accessToken  = signAccessToken(user);
    const refreshToken = await createRefreshToken(
      user._id,
      req.ip,
      req.headers['user-agent'] || ''
    );

    // Include restaurant plan info so frontend can show trial banners
    let restaurant = null;
    if (user.restaurantId) {
      const r = await Restaurant.findById(user.restaurantId).select(
        'name plan planStatus trialEndsAt'
      );
      if (r) {
        restaurant = {
          _id:         r._id,
          name:        r.name,
          plan:        r.plan,
          planStatus:  r.planStatus,
          trialEndsAt: r.trialEndsAt,
        };
      }
    }

    res.json({
      _id:               user._id,
      name:              user.name,
      role:              user.role,
      email:             user.email,
      branch:            user.branch,
      restaurantId:      user.restaurantId || null,
      mustChangePassword: user.mustChangePassword || false,
      token:             accessToken,
      refreshToken,
      restaurant,
      suspiciousLogin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const stored = await RefreshToken.findOne({
      token:     refreshToken,
      isRevoked: false,
    });

    if (!stored || stored.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ message: 'Invalid or expired refresh token — please log in again' });
    }

    // Rotate: revoke old, issue new
    const newRaw = crypto.randomBytes(40).toString('hex');
    stored.isRevoked       = true;
    stored.replacedByToken = newRaw;
    await stored.save();

    await RefreshToken.create({
      userId:    stored.userId,
      token:     newRaw,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const user = await User.findById(stored.userId);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Account is inactive. Contact your administrator.' });
    }

    // Reject refresh if the restaurant was deleted after the token was issued
    if (user.restaurantId) {
      const r = await Restaurant.findById(user.restaurantId).select('status').lean();
      if (!r || r.status === 'deleted') {
        return res.status(403).json({
          message: 'This restaurant has been permanently deleted.',
          code: 'RESTAURANT_DELETED',
        });
      }
    }

    const accessToken = signAccessToken(user);
    res.json({ token: accessToken, refreshToken: newRaw });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true }
      );
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/logout-all ─────────────────────────────────────────────────
// Protected — revokes every refresh token for the current user (all devices)
export const logoutAll = async (req, res) => {
  try {
    await RefreshToken.updateMany(
      { userId: req.user._id, isRevoked: false },
      { isRevoked: true }
    );
    req.user.logSecurityEvent('LOGOUT_ALL', req.ip, req.headers['user-agent'] || '').catch(() => {});
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/change-password ───────────────────────────────────────────
// Protected — changes the logged-in user's own password.
// If mustChangePassword is true, currentPassword is not required.
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'newPassword is required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If not a forced change, verify current password
    if (!user.mustChangePassword) {
      if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required' });
      const match = await user.matchPassword(currentPassword);
      if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password          = newPassword;
    user.mustChangePassword = false;
    await user.save({ validateModifiedOnly: true });

    // Revoke all refresh tokens — force re-login on all devices after password change
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
    user.logSecurityEvent('PASSWORD_CHANGED', req.ip, req.headers['user-agent'] || '').catch(() => {});

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Public — generates a 6-digit OTP for password reset.
// Accepts: { email } OR { name, restaurantSlug }
// In production, the OTP is emailed to the user. For now it is returned in the
// response so the flow is testable without an email service.
export const forgotPassword = async (req, res) => {
  try {
    const { email, name, restaurantSlug } = req.body;

    if (!email?.trim() && !name?.trim()) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    let user = null;

    // ── Email lookup (preferred) ───────────────────────────────────────────────
    if (email?.trim()) {
      user = await User.findOne({ email: email.trim().toLowerCase() })
        .select('+passwordResetToken +passwordResetExpires');
    }

    // ── Username + workspace lookup ────────────────────────────────────────────
    if (!user && name?.trim()) {
      let restaurantId = null;
      if (restaurantSlug?.trim()) {
        const restaurant = await Restaurant.findOne({
          slug: restaurantSlug.trim().toLowerCase(),
        }).select('_id');
        if (restaurant) restaurantId = restaurant._id;
      }

      const nameQuery = restaurantId ? { name: name.trim(), restaurantId } : { name: name.trim() };
      const candidates = await User.find(nameQuery)
        .select('+passwordResetToken +passwordResetExpires')
        .limit(2);

      if (candidates.length > 1) {
        return res.status(409).json({
          message: 'Multiple accounts found. Please provide your Workspace Code.',
          requiresWorkspace: true,
        });
      }
      user = candidates[0] || null;
    }

    // Always return 200 — prevents account enumeration
    if (!user) {
      return res.json({ message: 'If the account exists, an OTP has been sent.' });
    }

    // ── Generate 6-digit OTP ───────────────────────────────────────────────────
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');

    user.passwordResetToken   = hashed;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateModifiedOnly: true });

    // Production: send `otp` via email service and remove it from this response.
    // Development: return OTP directly so the UI can display it for testing.
    res.json({
      message:    'OTP sent successfully.',
      otp,        // DEVELOPMENT ONLY — remove when email service is wired up
      expiresIn:  600, // seconds (10 minutes)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Public — validates the 6-digit OTP and returns a short-lived reset token.
// The reset token is then used with POST /auth/reset-password.
export const verifyOtp = async (req, res) => {
  try {
    const { email, name, restaurantSlug, otp } = req.body;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'A valid 6-digit OTP is required' });
    }
    if (!email?.trim() && !name?.trim()) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    let user = null;

    // Same lookup logic as forgotPassword
    if (email?.trim()) {
      user = await User.findOne({ email: email.trim().toLowerCase() })
        .select('+passwordResetToken +passwordResetExpires');
    }

    if (!user && name?.trim()) {
      let restaurantId = null;
      if (restaurantSlug?.trim()) {
        const restaurant = await Restaurant.findOne({
          slug: restaurantSlug.trim().toLowerCase(),
        }).select('_id');
        if (restaurant) restaurantId = restaurant._id;
      }
      const nameQuery = restaurantId ? { name: name.trim(), restaurantId } : { name: name.trim() };
      const candidates = await User.find(nameQuery)
        .select('+passwordResetToken +passwordResetExpires')
        .limit(2);
      user = candidates.length === 1 ? candidates[0] : null;
    }

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Constant-time OTP comparison
    const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedInput !== user.passwordResetToken) {
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // OTP is valid — replace OTP hash with a secure reset token (15 min window to set password)
    const raw         = crypto.randomBytes(32).toString('hex');
    const hashedReset = crypto.createHash('sha256').update(raw).digest('hex');

    user.passwordResetToken   = hashedReset;
    user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 1000);
    await user.save({ validateModifiedOnly: true });

    res.json({
      message:    'OTP verified. Use the reset token to set a new password.',
      resetToken: raw,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Public — validates reset token and sets a new password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: 'token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired password reset token' });
    }

    user.password             = newPassword;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    // Revoke all refresh tokens (force re-login on all devices)
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

    user.logSecurityEvent('PASSWORD_RESET', req.ip, req.headers['user-agent'] || '').catch(() => {});

    res.json({
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
