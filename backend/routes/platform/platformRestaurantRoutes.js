import express from 'express';
import {
  createRestaurant,
  listRestaurants, getRestaurant,
  editRestaurant, deleteRestaurant,
  suspendRestaurant, activateRestaurant, changeRestaurantPlan,
  resetAdminPassword, listRestaurantUsers,
} from '../../controllers/platform/platformRestaurantController.js';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';
import validateObjectId from '../../middleware/validateObjectId.js';

const router = express.Router();

router.post('/',                             requireSuperAdmin, createRestaurant);
router.get('/',                              listRestaurants);
router.get('/:id',                           validateObjectId(), getRestaurant);
router.patch('/:id',                         requireSuperAdmin, validateObjectId(), editRestaurant);
router.delete('/:id',                        requireSuperAdmin, validateObjectId(), deleteRestaurant);
router.patch('/:id/suspend',                 requireSuperAdmin, validateObjectId(), suspendRestaurant);
router.patch('/:id/activate',                requireSuperAdmin, validateObjectId(), activateRestaurant);
router.patch('/:id/plan',                    requireSuperAdmin, validateObjectId(), changeRestaurantPlan);
router.post('/:id/reset-admin-password',     requireSuperAdmin, validateObjectId(), resetAdminPassword);
router.get('/:id/users',                     validateObjectId(), listRestaurantUsers);

export default router;
