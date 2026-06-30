import Issue from '../models/Issue.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Analytics Controller (doc §5.1.9 — Authority Dashboard)
 * ─────────────────────────────────────────────────────────
 * Provides the clean, operational metrics for officers:
 *  - Total / active / resolved / high-priority counts
 *  - AI Priority Queue (sorted by priority score)
 *  - Department performance + resolution scores
 */

/**
 * Get dashboard stats for the current authority.
 * GET /api/analytics/dashboard
 *
 * Scope:
 *  - super_admin      → city-wide
 *  - department_head  → their department
 *  - ward_officer     → their ward
 */
export const getDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    const filter = {};
    if (user.location && user.location.areaName) {
      filter['location.areaName'] = user.location.areaName;
    }

    if (user.role === 'ward_officer') filter.ward = user.ward;
    if (user.role === 'department_head')
      filter.assignedDepartment = user.department;

    const [
      totalIssues,
      activeIssues,
      resolvedIssues,
      highPriorityIssues,
      overdueIssues,
    ] = await Promise.all([
      Issue.countDocuments(filter),
      Issue.countDocuments({ ...filter, status: { $ne: 'Resolved' } }),
      Issue.countDocuments({ ...filter, status: 'Resolved' }),
      Issue.countDocuments({
        ...filter,
        priority: { $in: ['High', 'Critical'] },
        status: { $ne: 'Resolved' },
      }),
      Issue.countDocuments({ ...filter, isOverdue: true }),
    ]);

    // AI Priority Queue — top 10 unresolved issues by priority score.
    const priorityQueue = await Issue.find({
      ...filter,
      status: { $ne: 'Resolved' },
    })
      .sort({ priorityScore: -1 })
      .limit(10)
      .populate('reportedBy', 'name')
      .lean();

    // Category breakdown.
    const categoryBreakdown = await Issue.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Status breakdown.
    const statusBreakdown = await Issue.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return sendSuccess(res, 200, 'Dashboard retrieved', {
      stats: {
        totalIssues,
        activeIssues,
        resolvedIssues,
        highPriorityIssues,
        overdueIssues,
        resolutionRate:
          totalIssues > 0
            ? Math.round((resolvedIssues / totalIssues) * 100)
            : 0,
      },
      priorityQueue,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id,
        count: c.count,
      })),
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s._id,
        count: s.count,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get department performance metrics (doc §5.1.11.4).
 * GET /api/analytics/departments
 */
export const getDepartmentPerformance = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).lean();

    const performance = await Promise.all(
      departments.map(async (dept) => {
        const [total, resolved, open, highPriority] = await Promise.all([
          Issue.countDocuments({ assignedDepartment: dept.name }),
          Issue.countDocuments({
            assignedDepartment: dept.name,
            status: 'Resolved',
          }),
          Issue.countDocuments({
            assignedDepartment: dept.name,
            status: { $ne: 'Resolved' },
          }),
          Issue.countDocuments({
            assignedDepartment: dept.name,
            priority: { $in: ['High', 'Critical'] },
            status: { $ne: 'Resolved' },
          }),
        ]);

        const resolutionRate =
          total > 0 ? Math.round((resolved / total) * 100) : 0;

        return {
          department: dept.name,
          responsibilityArea: dept.responsibilityArea,
          total,
          resolved,
          open,
          highPriority,
          resolutionRate,
        };
      })
    );

    return sendSuccess(res, 200, 'Department performance retrieved', {
      performance,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get the AI Priority Queue (sorted issues).
 * GET /api/analytics/priority-queue
 */
export const getPriorityQueue = async (req, res, next) => {
  try {
    const user = req.user;
    const filter = { status: { $ne: 'Resolved' } };

    if (user.role === 'ward_officer') filter.ward = user.ward;
    if (user.role === 'department_head')
      filter.assignedDepartment = user.department;

    const queue = await Issue.find(filter)
      .sort({ priorityScore: -1, createdAt: -1 })
      .populate('reportedBy', 'name')
      .lean();

    return sendSuccess(res, 200, 'Priority queue retrieved', { queue });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default {
  getDashboard,
  getDepartmentPerformance,
  getPriorityQueue,
};
