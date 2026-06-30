import mongoose from 'mongoose';

/**
 * Notification Schema
 * ─────────────────────────────────────────────────────────
 * Lightweight per-user notifications for hyperlocal civic alerts and
 * issue lifecycle updates (doc §5.2.3 — "ensures users return").
 *
 * Examples:
 *  - "Your reported issue was assigned to PWD"
 *  - "An issue you supported has been resolved"
 *  - "Water outage reported in your locality"
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // 'issue_update' | 'alert' | 'resolution' | 'verification' | 'system'
    type: {
      type: String,
      enum: [
        'issue_update',
        'alert',
        'resolution',
        'verification',
        'system',
      ],
      default: 'system',
    },
    relatedIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
