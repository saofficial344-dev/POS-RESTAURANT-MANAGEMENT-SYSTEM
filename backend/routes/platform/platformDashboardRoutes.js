import express from 'express';
import { getPlatformStats, getBillingStats } from '../../controllers/platform/platformDashboardController.js';

const router = express.Router();
router.get('/stats',   getPlatformStats);
router.get('/billing', getBillingStats);
export default router;
