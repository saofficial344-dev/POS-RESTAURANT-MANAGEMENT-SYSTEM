import express from 'express';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import validateObjectId from '../../middleware/validateObjectId.js';
import {
  listAllPayments,
  exportPayments,
  getPaymentDetail,
  getPaymentStats,
  approvePayment,
  rejectPayment,
  requestResubmission,
} from '../../controllers/paymentController.js';

const router = express.Router();

router.get('/stats',             getPaymentStats);
router.get('/export',            exportPayments);
router.get('/',                  listAllPayments);
router.get('/:id', validateObjectId(), getPaymentDetail);

router.patch('/:id/approve',              requireSuperAdmin, validateObjectId(), approvePayment);
router.patch('/:id/reject',               requireSuperAdmin, validateObjectId(), rejectPayment);
router.patch('/:id/request-resubmission', requireSuperAdmin, validateObjectId(), requestResubmission);

export default router;
