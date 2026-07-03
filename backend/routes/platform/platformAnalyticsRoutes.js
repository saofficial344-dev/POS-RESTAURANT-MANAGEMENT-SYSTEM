import express from 'express';
import { getGrowthAnalytics, getRevenueAnalytics, getPlanAnalytics } from '../../controllers/platform/platformAnalyticsController.js';
import { cache } from '../../middleware/cache.js';

const router = express.Router();
// Platform analytics are expensive aggregations; cache for 5 minutes
router.get('/growth',  cache(300), getGrowthAnalytics);
router.get('/revenue', cache(300), getRevenueAnalytics);
router.get('/plans',   cache(300), getPlanAnalytics);
export default router;
