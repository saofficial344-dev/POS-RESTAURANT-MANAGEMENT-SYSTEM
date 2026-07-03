import express from 'express';
import protect           from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { adminOnly }     from '../middleware/roleMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import {
  getMySubscription,
  getPublicPlans,
  getUsage,
  getInvoices,
  getInvoiceDetail,
  requestUpgrade,
  requestCancel,
  requestReactivate,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Public — no auth needed to view plan list
router.get('/plans', getPublicPlans);

// Protected — restaurant users
router.use(protect, requireTenant);
router.get('/',                             getMySubscription);
router.get('/usage',                        getUsage);
router.get('/invoices',                     getInvoices);
router.get('/invoices/:id', validateObjectId(), getInvoiceDetail);
router.post('/upgrade',    adminOnly,       requestUpgrade);
router.post('/cancel',     adminOnly,       requestCancel);
router.post('/reactivate', adminOnly,       requestReactivate);

export default router;
