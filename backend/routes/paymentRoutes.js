import express from 'express';
import protect           from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { adminOnly }     from '../middleware/roleMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import {
  getMyPayments,
  submitManualPayment,
  cancelMyPayment,
} from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect, requireTenant, adminOnly);

router.get('/',            getMyPayments);
router.post('/',           submitManualPayment);
router.delete('/:id', validateObjectId(), cancelMyPayment);

export default router;
