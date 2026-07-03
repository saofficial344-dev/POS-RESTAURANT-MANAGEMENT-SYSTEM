import express from 'express';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import {
  listInvoices, getInvoice, markInvoicePaid, voidInvoice,
  refundInvoice, getBillingOverview, exportInvoices,
} from '../../controllers/platform/platformInvoiceController.js';

const router = express.Router();

router.get('/overview',          getBillingOverview);
router.get('/export',            exportInvoices);
router.get('/',                  listInvoices);
router.get('/:id',               getInvoice);
router.patch('/:id/mark-paid',   requireSuperAdmin, markInvoicePaid);
router.patch('/:id/void',        requireSuperAdmin, voidInvoice);
router.patch('/:id/refund',      requireSuperAdmin, refundInvoice);

export default router;
