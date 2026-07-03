import express from 'express';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import validateObjectId from '../../middleware/validateObjectId.js';
import {
  listPlans, getPlan, createPlan, updatePlan, archivePlan,
  togglePlan, duplicatePlan, deletePlan,
} from '../../controllers/platform/platformPlanController.js';

const router = express.Router();

router.get('/',           listPlans);
router.get('/:id',        validateObjectId(), getPlan);
router.post('/',          requireSuperAdmin, createPlan);
router.put('/:id',        requireSuperAdmin, validateObjectId(), updatePlan);
router.patch('/:id/archive',    requireSuperAdmin, validateObjectId(), archivePlan);
router.patch('/:id/toggle',     requireSuperAdmin, validateObjectId(), togglePlan);
router.post('/:id/duplicate',   requireSuperAdmin, validateObjectId(), duplicatePlan);
router.delete('/:id',           requireSuperAdmin, validateObjectId(), deletePlan);

export default router;
