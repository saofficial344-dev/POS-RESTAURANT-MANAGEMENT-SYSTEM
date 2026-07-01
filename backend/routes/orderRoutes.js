import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import {
  createOrder,
  getAllOrders,
  getOrder,
  getActiveOrders,
  getKitchenOrders,
  getTodayOrders,
  getCompletedOrders,
  updateOrderStatus,
  updateItemStatus,
  addItemToOrder,
  removeItemFromOrder,
  completeOrder,
  cancelOrder,
} from '../controllers/orderController.js';

const router = express.Router();
router.use(protect);

router.get('/kitchen', allowRoles('kitchen', 'admin', 'manager'), getKitchenOrders);
router.get('/active', allowRoles('admin', 'manager', 'kitchen', 'cashier', 'waiter', 'delivery'), getActiveOrders);
router.get('/today', allowRoles('admin', 'manager', 'cashier'), getTodayOrders);
router.get('/completed', allowRoles('admin', 'manager', 'cashier'), getCompletedOrders);
router.get('/', allowRoles('admin', 'manager', 'cashier', 'waiter', 'delivery'), getAllOrders);
router.post('/', allowRoles('admin', 'cashier', 'waiter'), createOrder);

router.get('/:id', getOrder);
router.patch('/:id/status', allowRoles('admin', 'manager', 'kitchen', 'cashier', 'waiter', 'delivery'), updateOrderStatus);
router.patch('/:id/item/:itemIndex/status', allowRoles('kitchen', 'admin', 'manager'), updateItemStatus);
router.post('/:id/items', allowRoles('admin', 'cashier', 'waiter'), addItemToOrder);
router.delete('/:id/items/:itemIndex', allowRoles('admin', 'cashier', 'waiter'), removeItemFromOrder);
router.post('/:id/complete', allowRoles('manager'), completeOrder);
router.post('/:id/cancel', allowRoles('manager'), cancelOrder);

export default router;
