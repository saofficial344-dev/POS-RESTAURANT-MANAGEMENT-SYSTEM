import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { allowRoles, adminOnly } from '../middleware/roleMiddleware.js';
import { requireWithinLimit } from '../middleware/subscriptionMiddleware.js';
import {
  getAllTables,
  getAvailableTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  assignOrderToTable,
  clearTable,
  reserveTable,
  getOccupancyStatus,
  markTableAsCleaned,
  markTableForCleaning,
} from '../controllers/tableController.js';

const router = express.Router();
router.use(protect);

router.get('/occupancy', allowRoles('admin', 'manager'), getOccupancyStatus);
router.get('/available', allowRoles('admin', 'manager', 'waiter', 'cashier'), getAvailableTables);
router.get('/', allowRoles('admin', 'manager', 'waiter', 'cashier'), getAllTables);
router.post('/', allowRoles('admin', 'manager'), requireWithinLimit('tables'), createTable);

router.get('/:id', getTable);
router.patch('/:id', allowRoles('admin', 'manager'), updateTable);
router.delete('/:id', protect, adminOnly, deleteTable);
router.patch('/:id/assign', allowRoles('admin', 'waiter', 'cashier', 'manager'), assignOrderToTable);
router.patch('/:id/clear', allowRoles('admin', 'waiter', 'cashier', 'manager'), clearTable);
router.patch('/:id/reserve', allowRoles('admin', 'manager', 'waiter'), reserveTable);
router.patch('/:id/clean', allowRoles('admin', 'manager', 'waiter'), markTableAsCleaned);
router.patch('/:id/needs-cleaning', allowRoles('admin', 'manager', 'waiter'), markTableForCleaning);

export default router;
