import express from 'express';
import {
  createBill,
  getBills,
  getUnpaidBills,
  getSingleBill,
  payBill,
  voidBill,
  deleteBill,
  deleteAllBills,
} from '../controllers/billController.js';
import protect from '../middleware/authMiddleware.js';
import { adminOnly, allowRoles } from '../middleware/roleMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { requireActiveSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();
router.use(protect, requireActiveSubscription);

// DELETE /all must come before DELETE /:id so 'all' isn't parsed as an ObjectId
router.delete('/all', adminOnly, deleteAllBills);

router.get('/unpaid', allowRoles('admin', 'manager', 'cashier'), getUnpaidBills);
router.get('/',       allowRoles('admin', 'manager', 'cashier'), getBills);
router.post('/',      allowRoles('admin', 'manager', 'cashier', 'waiter'), createBill);

router.get('/:id',         validateObjectId(), allowRoles('admin', 'manager', 'cashier'), getSingleBill);
router.patch('/:id/pay',   validateObjectId(), allowRoles('admin', 'manager', 'cashier'), payBill);
router.put('/void/:id',    adminOnly, validateObjectId(), voidBill);
router.delete('/:id',      adminOnly, validateObjectId(), deleteBill);

export default router;
