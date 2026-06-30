import Department from '../models/Department.js';
import Issue from '../models/Issue.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Department Controller (doc §5.1.8 — Authority Directory)
 * ─────────────────────────────────────────────────────────
 * The directory is a discovery & trust layer that attracts users who want
 * governance information, then keeps them for reporting and tracking.
 */

/**
 * Get all departments (public directory).
 * GET /api/departments
 */
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'name designation')
      .sort({ name: 1 })
      .lean();

    return sendSuccess(res, 200, 'Departments retrieved', { departments });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get a single department by ID.
 * GET /api/departments/:id
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'name designation phone email')
      .lean();

    if (!department) throw new ApiError(404, 'Department not found');

    return sendSuccess(res, 200, 'Department retrieved', { department });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Create a department (super_admin only).
 * POST /api/departments
 */
export const createDepartment = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    return sendSuccess(res, 201, 'Department created', { department });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get issues assigned to a department.
 * GET /api/departments/:id/issues
 */
export const getDepartmentIssues = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) throw new ApiError(404, 'Department not found');

    const issues = await Issue.find({ assignedDepartment: department.name })
      .sort({ priorityScore: -1, createdAt: -1 })
      .populate('reportedBy', 'name')
      .lean();

    return sendSuccess(res, 200, 'Department issues retrieved', { issues });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default {
  getDepartments,
  getDepartmentById,
  createDepartment,
  getDepartmentIssues,
};
