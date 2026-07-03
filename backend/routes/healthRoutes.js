import express from 'express';
import { getHealth, getMetricsSnapshot } from '../controllers/healthController.js';
import platformProtect, { requireSuperAdmin } from '../middleware/platformAuthMiddleware.js';

const router = express.Router();

// Public — load balancers and uptime monitors hit this
router.get('/', getHealth);

// Detailed metrics snapshot — platform superadmin only
router.get('/metrics', platformProtect, requireSuperAdmin, getMetricsSnapshot);

export default router;
