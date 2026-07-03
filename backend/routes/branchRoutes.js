import express from 'express';
import {
  createBranch,
  getBranches,
  getBranch,
  getBranchStats,
  updateBranch,
  toggleBranchStatus,
  setDefaultBranch,
  deleteBranch,
} from '../controllers/branchController.js';
import protect       from '../middleware/authMiddleware.js';
import { adminOnly, allowRoles } from '../middleware/roleMiddleware.js';
import { requireTenant }         from '../middleware/tenantMiddleware.js';
import validateObjectId          from '../middleware/validateObjectId.js';
import { requireWithinLimit }    from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

// All branch routes require authentication + restaurant context
router.use(protect, requireTenant);

// ── Read (all authenticated roles) ────────────────────────────────────────────
// Non-admin roles automatically see only their own branch (enforced in controller)
router.get('/',                      getBranches);
router.get('/:id',                   validateObjectId(), getBranch);
router.get('/:id/stats',             validateObjectId(), getBranchStats);

// ── Mutations (admin only) ────────────────────────────────────────────────────
router.post('/',                     adminOnly, requireWithinLimit('branches'), createBranch);
router.put('/:id',                   adminOnly, validateObjectId(), updateBranch);
router.patch('/:id/status',          adminOnly, validateObjectId(), toggleBranchStatus);
router.patch('/:id/set-default',     adminOnly, validateObjectId(), setDefaultBranch);
router.delete('/:id',                adminOnly, validateObjectId(), deleteBranch);

export default router;
