import express from 'express';
import { listApiKeys, createApiKey, toggleApiKey, revokeApiKey } from '../../controllers/platform/platformApiKeyController.js';
import { requireSuperAdmin } from '../../middleware/platformAuthMiddleware.js';

const router = express.Router();
router.get('/',               listApiKeys);
router.post('/',              requireSuperAdmin, createApiKey);
router.patch('/:id/toggle',   toggleApiKey);
router.delete('/:id',         requireSuperAdmin, revokeApiKey);
export default router;
