import jwt           from 'jsonwebtoken';
import PlatformAdmin from '../../models/PlatformAdmin.js';
import { logPlatformAction } from '../../utils/platformAudit.js';

const signPlatformToken = (admin) =>
  jwt.sign(
    {
      id:         admin._id,
      email:      admin.email,
      name:       admin.name,
      role:       admin.role,
      isPlatform: true,           // distinguishes from restaurant tokens
    },
    process.env.JWT_SECRET_PLATFORM,
    { expiresIn: '12h' }          // shorter-lived than restaurant (1d) tokens
  );

// ── POST /platform/v1/auth/login ──────────────────────────────────────────────
export const platformLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim() })
      .select('+password +loginAttempts +lockUntil');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (admin.isLocked()) {
      const mins = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message:     `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
        lockedUntil: admin.lockUntil,
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Platform account is inactive' });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      await admin.incrementLoginAttempts();
      logPlatformAction(admin, 'PLATFORM_LOGIN_FAILED', 'platform_admin', admin._id, admin.email, req);
      const remaining = Math.max(0, 5 - admin.loginAttempts);
      return res.status(401).json({
        message: remaining > 0
          ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Account locked due to too many failed attempts.',
      });
    }

    await admin.clearLoginAttempts();
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.ip;
    await admin.save({ validateModifiedOnly: true });

    const token = signPlatformToken(admin);
    logPlatformAction(admin, 'PLATFORM_LOGIN', 'platform_admin', admin._id, admin.email, req);

    res.json({
      token,
      admin: {
        _id:   admin._id,
        name:  admin.name,
        email: admin.email,
        role:  admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /platform/v1/auth/me ──────────────────────────────────────────────────
export const platformMe = (req, res) => {
  const { _id, name, email, role, lastLoginAt, lastLoginIp } = req.platformAdmin;
  res.json({ _id, name, email, role, lastLoginAt, lastLoginIp });
};

// ── POST /platform/v1/auth/logout ─────────────────────────────────────────────
export const platformLogout = (req, res) => {
  logPlatformAction(req.platformAdmin, 'PLATFORM_LOGOUT', 'platform_admin', req.platformAdmin._id, req.platformAdmin.email, req);
  res.json({ message: 'Logged out' });
};
