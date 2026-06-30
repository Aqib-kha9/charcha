import User from '../models/User.js';
import Issue from '../models/Issue.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Authority Management Controller (doc §5.1.11)
 * ─────────────────────────────────────────────────────────
 * Manages the authority hierarchy: super_admin → department_head →
 * ward_officer. Includes the "Handover" mechanism for officer transfers
 * (doc edge case: "Officer Transfers").
 */

/**
 * List all authority accounts (super_admin / department_head).
 * GET /api/authorities
 */
export const getAuthorities = async (req, res, next) => {
  try {
    const filter = { role: { $in: ['ward_officer', 'department_head', 'super_admin'] } };

    // Department heads see only their department's officers.
    if (req.user.role === 'department_head') {
      filter.department = req.user.department;
      filter.role = 'ward_officer';
    }

    const authorities = await User.find(filter)
      .select('-password')
      .sort({ role: 1, name: 1 })
      .lean();

    // Attach live issue counts per officer.
    const withCounts = await Promise.all(
      authorities.map(async (a) => {
        const [assigned, resolved] = await Promise.all([
          Issue.countDocuments({
            assignedTo: a._id,
            status: { $ne: 'Resolved' },
          }),
          Issue.countDocuments({
            resolvedBy: a._id,
            status: 'Resolved',
          }),
        ]);
        return { ...a, activeIssues: assigned, resolvedIssues: resolved };
      })
    );

    return sendSuccess(res, 200, 'Authorities retrieved', {
      authorities: withCounts,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Create a new authority account (super_admin only).
 * POST /api/authorities
 */
export const createAuthority = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      ward,
      zone,
      designation,
      phone,
    } = req.body;

    if (!['ward_officer', 'department_head', 'super_admin'].includes(role)) {
      throw new ApiError(400, 'Invalid authority role');
    }

    const existing = await User.findOne({ email: email?.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'Email is already registered');
    }

    const authority = await User.create({
      name,
      email,
      password,
      phone,
      role,
      department,
      ward,
      zone,
      designation,
      isVerifiedAuthority: true,
      location: req.user.location, // Inherit district from super_admin
    });

    return sendSuccess(res, 201, 'Authority account created', {
      authority: authority.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Handover all active issues from one officer to another
 * (doc edge case: "Officer Transfers").
 * POST /api/authorities/handover
 * Body: { fromUserId, toUserId }
 */
export const handoverIssues = async (req, res, next) => {
  try {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
      throw new ApiError(400, 'fromUserId and toUserId are required');
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId),
    ]);

    if (!fromUser || !toUser) {
      throw new ApiError(404, 'One or both users not found');
    }

    // Reassign all active issues.
    const result = await Issue.updateMany(
      {
        $or: [{ assignedTo: fromUserId }, { resolvedBy: fromUserId }],
        status: { $ne: 'Resolved' },
      },
      {
        $set: {
          assignedTo: toUserId,
          assignedOfficer: toUser.name,
        },
        $push: {
          timeline: {
            status: 'Assigned',
            note: `Issue handed over from ${fromUser.name} to ${toUser.name} due to officer transfer.`,
            updatedBy: req.user._id,
            updatedByName: req.user.name,
            timestamp: new Date(),
          },
        },
      }
    );

    return sendSuccess(res, 200, 'Handover complete', {
      reassignedIssues: result.modifiedCount,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Update an authority account (super_admin only).
 * PUT /api/authorities/:id
 */
export const updateAuthority = async (req, res, next) => {
  try {
    const { name, designation, department, ward, zone, isActive } = req.body;

    const authority = await User.findById(req.params.id);
    if (!authority) throw new ApiError(404, 'Authority not found');

    if (name !== undefined) authority.name = name;
    if (designation !== undefined) authority.designation = designation;
    if (department !== undefined) authority.department = department;
    if (ward !== undefined) authority.ward = ward;
    if (zone !== undefined) authority.zone = zone;
    if (isActive !== undefined) authority.isActive = isActive;

    await authority.save();

    return sendSuccess(res, 200, 'Authority updated', {
      authority: authority.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default {
  getAuthorities,
  createAuthority,
  handoverIssues,
  updateAuthority,
};
