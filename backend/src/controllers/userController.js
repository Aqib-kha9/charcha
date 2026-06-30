import User from '../models/User.js';
import Issue from '../models/Issue.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * User Controller
 * Handles public user profile, civic reputation (impact score),
 * and the community leaderboard.
 *
 * NOTE: Authenticated "me" data (own profile, update) lives in authController.
 * These endpoints expose *public* reputation data to the community.
 */

/**
 * @desc    Get a user's public profile + recent public reports
 * @route   GET /api/users/:id
 * @access  Public
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -email -phone -trustScore -isShadowBanned -isActive'
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Fetch the user's most recent public (non-anonymous) reports
    const reports = await Issue.find({
      reportedBy: user._id,
      isAnonymous: false,
      isHidden: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title category status severity priorityScore createdAt location.areaName');

    return sendSuccess(res, 200, 'User profile fetched', {
      user: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        reputationBadge: user.reputationBadge,
        impactScore: user.impactScore,
        reportsSubmitted: user.reportsSubmitted,
        issuesResolved: user.issuesResolved,
        verificationsSubmitted: user.verificationsSubmitted,
        confirmationsSubmitted: user.confirmationsSubmitted,
        joinedAt: user.createdAt,
      },
      reports,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a user's civic reputation / impact score breakdown
 * @route   GET /api/users/:id/impact-score
 * @access  Public
 */
export const getUserImpactScore = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name avatarUrl impactScore reportsSubmitted issuesResolved verificationsSubmitted confirmationsSubmitted resolutionScore avgResolutionDays satisfactionRating reputationBadge role'
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Compute contribution breakdown for the badge-progression UI
    const breakdown = {
      reports: user.reportsSubmitted * 5, // 5 pts per report
      resolved: user.issuesResolved * 10, // 10 pts per resolved issue
      verifications: user.verificationsSubmitted * 3, // 3 pts per verification
      confirmations: user.confirmationsSubmitted * 2, // 2 pts per confirmation
    };

    const computedTotal =
      breakdown.reports +
      breakdown.resolved +
      breakdown.verifications +
      breakdown.confirmations;

    return sendSuccess(res, 200, 'Impact score fetched', {
      user: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      impactScore: user.impactScore,
      reputationBadge: user.reputationBadge,
      breakdown,
      computedTotal,
      stats: {
        reportsSubmitted: user.reportsSubmitted,
        issuesResolved: user.issuesResolved,
        verificationsSubmitted: user.verificationsSubmitted,
        confirmationsSubmitted: user.confirmationsSubmitted,
      },
      performance:
        user.role !== 'citizen'
          ? {
              resolutionScore: user.resolutionScore,
              avgResolutionDays: user.avgResolutionDays,
              satisfactionRating: user.satisfactionRating,
            }
          : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get community leaderboard (top citizens by impact score)
 * @route   GET /api/users/leaderboard
 * @access  Public
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const areaName = req.query.areaName;

    const filter = {
      role: 'citizen',
      isShadowBanned: { $ne: true },
      impactScore: { $gt: 0 },
    };

    if (areaName) {
      filter['location.areaName'] = areaName;
    }

    const leaderboard = await User.find(filter)
      .sort({ impactScore: -1 })
      .limit(limit)
      .select('name avatarUrl impactScore reputationBadge reportsSubmitted issuesResolved');

    return sendSuccess(res, 200, 'Leaderboard fetched', {
      leaderboard,
      count: leaderboard.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get authorities (officials/admins) onboarded in a specific area
 * @route   GET /api/users/authorities
 * @access  Public
 */
export const getAuthorities = async (req, res, next) => {
  try {
    const areaName = req.query.areaName;

    const filter = {
      role: { $in: ['ward_officer', 'department_head', 'super_admin'] },
      isActive: true,
    };

    if (areaName) {
      filter['location.areaName'] = areaName;
    }

    const authorities = await User.find(filter)
      .select('name avatarUrl role designation department ward zone email isVerifiedAuthority')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Authorities fetched', {
      authorities,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getUserProfile,
  getUserImpactScore,
  getLeaderboard,
  getAuthorities,
};
