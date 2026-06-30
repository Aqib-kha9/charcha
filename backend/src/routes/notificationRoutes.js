import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Notification Routes (doc §5.2.3)
 *  GET   /api/notifications          - List user notifications
 *  PATCH /api/notifications/:id/read - Mark one as read
 *  PATCH /api/notifications/read-all - Mark all as read
 */
router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);

export default router;
