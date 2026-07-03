import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { cache }       from '../middleware/cache.js';
import { requireActiveSubscription } from '../middleware/subscriptionMiddleware.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

// Cache for 60 s — dashboard is expensive to compute; 1-minute staleness is acceptable
// Note: analytics feature flag NOT required — dashboard KPIs are core operational data,
// not a premium analytics feature. All authenticated staff can see their restaurant's live data.
router.get('/stats', protect, requireActiveSubscription, allowRoles('admin', 'manager'), cache(60), getDashboardStats);

export default router;
