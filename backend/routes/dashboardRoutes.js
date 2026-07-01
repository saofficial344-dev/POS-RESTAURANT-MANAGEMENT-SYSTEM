import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', protect, allowRoles('admin', 'manager'), getDashboardStats);

export default router;
