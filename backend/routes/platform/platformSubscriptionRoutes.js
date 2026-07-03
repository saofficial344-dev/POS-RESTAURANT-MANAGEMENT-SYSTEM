import express from 'express';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import {
  listSubscriptions,
  getSubscription,
  platformChangePlan,
  platformCancelSubscription,
  platformReactivateSubscription,
} from '../../controllers/platform/platformSubscriptionController.js';

const router = express.Router();

router.get('/',                      listSubscriptions);
router.get('/:id',                   getSubscription);
router.patch('/:id/change-plan',     requireSuperAdmin, platformChangePlan);
router.patch('/:id/cancel',          requireSuperAdmin, platformCancelSubscription);
router.patch('/:id/reactivate',      requireSuperAdmin, platformReactivateSubscription);

export default router;
