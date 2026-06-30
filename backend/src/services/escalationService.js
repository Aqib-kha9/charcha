import Issue from '../models/Issue.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

/**
 * Escalation Service (doc §5.1.11.3)
 * ─────────────────────────────────────────────────────────
 * If no action is taken within a defined period (7 days in demo), the
 * issue auto-escalates:
 *   Level 0 → assigned ward officer (default)
 *   Level 1 → escalated to Department Head
 *   Level 2 → escalated to Super Admin
 *
 * This module exposes:
 *  - escalateOverdueIssues() : cron-style sweep that promotes overdue issues
 *  - setDueDate()             : helper to compute the deadline for an issue
 *  - notifyEscalation()       : sends notifications up the chain
 */

const ESCALATION_WINDOW_DAYS = 7;

/**
 * Compute the due date for an issue (now + window).
 * @returns {Date}
 */
export const setDueDate = () => {
  const due = new Date();
  due.setDate(due.getDate() + ESCALATION_WINDOW_DAYS);
  return due;
};

/**
 * Sweep all non-resolved issues and escalate those past their due date.
 * Intended to run on a schedule (e.g. daily cron / setInterval).
 *
 * @returns {Promise<number>} count of escalated issues
 */
export const escalateOverdueIssues = async () => {
  try {
    const now = new Date();

    // Find overdue, non-resolved issues not yet at max escalation.
    const overdueIssues = await Issue.find({
      status: { $ne: 'Resolved' },
      dueAt: { $lte: now },
      escalationLevel: { $lt: 2 },
      isOverdue: false,
    });

    let escalated = 0;

    for (const issue of overdueIssues) {
      issue.escalationLevel += 1;
      issue.isOverdue = true;
      // Push the next deadline out by another window.
      issue.dueAt = setDueDate();

      issue.timeline.push({
        status: issue.status,
        note: `Auto-escalated to level ${issue.escalationLevel} due to inactivity.`,
        timestamp: now,
      });

      await issue.save();
      await notifyEscalation(issue);
      escalated += 1;
    }

    if (escalated > 0) {
      logger.info(`⏫ Escalated ${escalated} overdue issue(s).`);
    }

    return escalated;
  } catch (error) {
    logger.error(`Escalation sweep error: ${error.message}`);
    return 0;
  }
};

/**
 * Notify the next authority up the chain about an escalation.
 * @param {object} issue
 */
export const notifyEscalation = async (issue) => {
  try {
    // Find the relevant authority to notify based on escalation level.
    let targetRole = 'department_head';
    if (issue.escalationLevel >= 2) targetRole = 'super_admin';

    const authority = await User.findOne({
      role: targetRole,
      department: issue.assignedDepartment,
      isActive: true,
    });

    if (authority) {
      await Notification.create({
        user: authority._id,
        title: 'Issue Escalated',
        message: `Issue "${issue.title}" has been auto-escalated to level ${issue.escalationLevel} due to inactivity.`,
        type: 'issue_update',
        relatedIssue: issue._id,
      });
    }
  } catch (error) {
    logger.error(`notifyEscalation error: ${error.message}`);
  }
};

/**
 * Start the escalation sweep on a daily interval.
 * Safe to call once at server boot.
 */
export const startEscalationScheduler = () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // Run once immediately (async, non-blocking), then daily.
  escalateOverdueIssues();
  setInterval(escalateOverdueIssues, ONE_DAY);
  logger.info('⏰ Escalation scheduler started (runs daily).');
};

export default {
  setDueDate,
  escalateOverdueIssues,
  notifyEscalation,
  startEscalationScheduler,
};
