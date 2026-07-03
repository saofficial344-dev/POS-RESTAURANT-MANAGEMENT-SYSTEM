import express          from 'express';
import platformProtect  from '../../middleware/platformAuthMiddleware.js';
import { platformApiLimiter } from '../../middleware/rateLimitMiddleware.js';

import platformAuthRoutes        from './platformAuthRoutes.js';
import platformDashboardRoutes   from './platformDashboardRoutes.js';
import platformRestaurantRoutes  from './platformRestaurantRoutes.js';
import platformAnalyticsRoutes   from './platformAnalyticsRoutes.js';
import platformAuditRoutes       from './platformAuditRoutes.js';
import platformApiKeyRoutes      from './platformApiKeyRoutes.js';
import platformPlanRoutes        from './platformPlanRoutes.js';
import platformSubscriptionRoutes from './platformSubscriptionRoutes.js';
import platformInvoiceRoutes     from './platformInvoiceRoutes.js';
import platformFeatureFlagRoutes from './platformFeatureFlagRoutes.js';
import platformPaymentRoutes    from './platformPaymentRoutes.js';

const router = express.Router();

// Rate limit all platform API requests
router.use(platformApiLimiter);

// Auth routes — public (login) + protected (me, logout)
router.use('/auth',        platformAuthRoutes);

// All routes below require a valid platform JWT
router.use(platformProtect);
router.use('/dashboard',      platformDashboardRoutes);
router.use('/restaurants',    platformRestaurantRoutes);
router.use('/analytics',      platformAnalyticsRoutes);
router.use('/audit-logs',     platformAuditRoutes);
router.use('/api-keys',       platformApiKeyRoutes);
router.use('/plans',          platformPlanRoutes);
router.use('/subscriptions',  platformSubscriptionRoutes);
router.use('/invoices',       platformInvoiceRoutes);
router.use('/feature-flags',  platformFeatureFlagRoutes);
router.use('/payments',       platformPaymentRoutes);

export default router;
