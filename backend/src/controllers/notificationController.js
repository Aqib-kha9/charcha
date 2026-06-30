import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Notification Controller (doc §5.2.3)
 * ─────────────────────────────────────────────────────────
 * Per-user notifications for hyperlocal civic alerts and issue lifecycle
 * updates. Drives user retention.
 */

/**
 * Get notifications for the current user.
 * GET /api/notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly = 'false', limit = 20 } = req.query;

    const filter = { user: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('relatedIssue', 'title status category')
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    return sendSuccess(res, 200, 'Notifications retrieved', {
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Mark a notification as read.
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new ApiError(404, 'Notification not found');

    if (notification.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to access this notification');
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(res, 200, 'Notification marked as read', {
      notification,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Mark all notifications as read.
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    return sendSuccess(res, 200, 'All notifications marked as read', {});
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default { getNotifications, markAsRead, markAllAsRead };
