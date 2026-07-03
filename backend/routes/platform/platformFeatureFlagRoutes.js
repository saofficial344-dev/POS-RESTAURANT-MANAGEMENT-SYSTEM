import express from 'express';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import {
  listFlags, getFlag, createFlag, updateFlag, toggleFlag,
  setRestaurantOverride, removeRestaurantOverride,
} from '../../controllers/platform/platformFeatureFlagController.js';

const router = express.Router();

router.get('/',                                      listFlags);
router.get('/:id',                                   getFlag);
router.post('/',                    requireSuperAdmin, createFlag);
router.put('/:id',                  requireSuperAdmin, updateFlag);
router.patch('/:id/toggle',         requireSuperAdmin, toggleFlag);
router.post('/:id/override',        requireSuperAdmin, setRestaurantOverride);
router.delete('/:id/override/:restaurantId', requireSuperAdmin, removeRestaurantOverride);

export default router;
