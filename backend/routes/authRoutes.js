import express from 'express';
import {
  loginUser,
  registerUser,
  refreshTokens,
  logoutUser,
  logoutAll,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/login',           loginUser);
router.post('/refresh',         refreshTokens);
router.post('/logout',          logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp',      verifyOtp);
router.post('/reset-password',  resetPassword);

// ── Protected: skip mustChangePassword check so user can actually change it ───
router.post('/change-password', (req, _res, next) => { req.skipMustChange = true; next(); }, protect, changePassword);

// ── Protected: admin creates staff accounts ───────────────────────────────────
router.post('/register',   protect, adminOnly, registerUser);
router.post('/logout-all', protect, logoutAll);

export default router;
