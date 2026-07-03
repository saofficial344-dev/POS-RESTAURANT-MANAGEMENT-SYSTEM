import express from 'express';
import { platformLogin, platformMe, platformLogout } from '../../controllers/platform/platformAuthController.js';
import platformProtect from '../../middleware/platformAuthMiddleware.js';
import { platformAuthLimiter } from '../../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login',  platformAuthLimiter, platformLogin);
router.get('/me',      platformProtect, platformMe);
router.post('/logout', platformProtect, platformLogout);

export default router;
