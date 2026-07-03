import express from 'express';
import protect from '../middleware/authMiddleware.js';
import validateObjectId from '../middleware/validateObjectId.js';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/',                                      getNotifications);
router.patch('/read-all',                            markAllRead);
router.patch('/:id/read', validateObjectId(),        markRead);
router.delete('/:id',     validateObjectId(),        deleteNotification);

export default router;
