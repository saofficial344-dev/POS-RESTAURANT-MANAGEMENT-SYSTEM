import express from 'express';
import { getAuditLogs } from '../../controllers/platform/platformAuditController.js';

const router = express.Router();
router.get('/', getAuditLogs);
export default router;
