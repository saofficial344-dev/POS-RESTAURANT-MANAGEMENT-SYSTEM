import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { requireActiveSubscription, requireWithinLimit, requireFeature } from '../middleware/subscriptionMiddleware.js';
import {
  createOrder,
  getAllOrders,
  getOrder,
  getActiveOrders,
  getKitchenOrders,
  getReadyOrders,
  getTodayOrders,
  getCompletedOrders,
  getOrderKPIs,
  updateOrderStatus,
  updateItemStatus,
  addItemToOrder,
  removeItemFromOrder,
  completeOrder,
  cancelOrder,
} from '../controllers/orderController.js';

const router = express.Router();
router.use(protect, requireActiveSubscription);

// ── Collection routes (must be before /:id) ──────────────────────────────────
router.get('/kitchen',
  requireFeature('kitchenDisplay'),
  allowRoles('kitchen', 'admin', 'manager'),
  getKitchenOrders
);
router.get('/ready',        allowRoles('admin', 'manager', 'waiter'),                                  getReadyOrders);
router.get('/active',       allowRoles('admin', 'manager', 'kitchen', 'cashier', 'waiter', 'delivery'), getActiveOrders);
router.get('/today',        allowRoles('admin', 'manager', 'cashier'),                                  getTodayOrders);
router.get('/completed',    allowRoles('admin', 'manager', 'cashier'),                                  getCompletedOrders);
router.get('/kpis',         allowRoles('admin', 'manager'),                                             getOrderKPIs);
router.get('/',             allowRoles('admin', 'manager', 'cashier', 'waiter', 'delivery'),            getAllOrders);
router.post('/',            allowRoles('admin', 'cashier', 'waiter'), requireWithinLimit('monthlyOrders'), createOrder);

// ── Instance routes ───────────────────────────────────────────────────────────
router.get('/:id',
  validateObjectId(),
  getOrder
);
router.patch('/:id/status',
  validateObjectId(),
  // Role enforcement is inside updateOrderStatus itself (per-transition)
  allowRoles('admin', 'manager', 'kitchen', 'cashier', 'waiter', 'delivery'),
  updateOrderStatus
);
router.patch('/:id/item/:itemIndex/status',
  validateObjectId(),
  allowRoles('kitchen', 'admin', 'manager'),
  updateItemStatus
);
router.post('/:id/items',
  validateObjectId(),
  allowRoles('admin', 'cashier', 'waiter'),
  addItemToOrder
);
router.delete('/:id/items/:itemIndex',
  validateObjectId(),
  allowRoles('admin', 'cashier', 'waiter'),
  removeItemFromOrder
);
router.post('/:id/complete',
  validateObjectId(),
  allowRoles('admin', 'manager', 'cashier'),
  completeOrder
);
router.post('/:id/cancel',
  validateObjectId(),
  allowRoles('admin', 'manager'),
  cancelOrder
);

export default router;
