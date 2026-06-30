import fs from 'fs';
import crypto from 'crypto';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { triggerHeatmapRecompute } from './heatmapController.js';
import {
  analyzeIssueImage,
  calculatePriorityScore,
  moderateContent,
  verifyResolutionImage,
} from '../services/geminiService.js';
import {
  buildGeoQuery,
  resolveAreaName,
  detectGpsSpoofing,
  haversineDistance,
} from '../utils/geoUtils.js';
import { setDueDate } from '../services/escalationService.js';
import { uploadImage } from '../services/cloudinaryService.js';

/**
 * Issue Controller — the core of CHARCHA
 * ─────────────────────────────────────────────────────────
 * Implements the full issue lifecycle:
 *  - AI image analysis (§5.1.2)            : analyzeImage
 *  - Duplicate detection (§5.1.10)          : checkDuplicates
 *  - Create issue (§5.1.2, §5.1.3, §5.1.4)  : createIssue
 *  - Community feed (§5.1.5)                : getIssues
 *  - Confirm + Support (§5.1.6)            : confirmIssue, supportIssue
 *  - Status workflow (§5.1.7, §5.1.11.3)    : updateStatus
 *  - Resolution evidence (§5.2.4)          : resolveIssue, verifyResolution
 *  - Authority assignment (§5.1.11.2)      : assignIssue
 */

/**
 * AI-analyze an uploaded image and return structured report data.
 * POST /api/issues/analyze  (multipart: field "image")
 */
export const analyzeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload an image to analyze');
    }

    const analysis = await analyzeIssueImage(
      req.file.buffer,
      req.file.mimetype
    );

    const imageUrl = await uploadImage(req.file.buffer, 'charcha_issues');

    return sendSuccess(res, 200, 'AI analysis complete', {
      analysis,
      imageUrl,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Check for duplicate issues near a location + category (§5.1.10).
 * POST /api/issues/check-duplicates
 * Body: { latitude, longitude, category }
 */
export const checkDuplicates = async (req, res, next) => {
  try {
    const { latitude, longitude, category } = req.body;

    if (latitude == null || longitude == null) {
      throw new ApiError(400, 'Latitude and longitude are required');
    }

    const query = {
      ...buildGeoQuery(longitude, latitude, config.duplicateRadiusMeters),
      status: { $ne: 'Resolved' },
    };
    if (category) query.category = category;

    const duplicates = await Issue.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reportedBy', 'name')
      .lean();

    return sendSuccess(res, 200, 'Duplicate check complete', {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map((d) => ({
        id: d._id,
        title: d.title,
        category: d.category,
        severity: d.severity,
        status: d.status,
        areaName: d.location?.areaName,
        confirmationCount: d.confirmationCount,
        supportCount: d.supportCount,
        imageUrl: d.imageUrl,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Create a new issue (§5.1.2, §5.1.3, §5.1.4, §5.1.10).
 * POST /api/issues  (multipart: field "image")
 * Body: title, description, category, severity, latitude, longitude,
 *       areaName, isAnonymous
 */
export const createIssue = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      severity,
      latitude,
      longitude,
      areaName,
      isAnonymous = false,
    } = req.body;

    const isAnon = isAnonymous === 'true' || isAnonymous === true;

    if (latitude == null || longitude == null) {
      throw new ApiError(400, 'Location (latitude, longitude) is required');
    }

    const user = req.user;

    // ── GPS Spoofing Detection (doc edge case: "Malicious Mass Reporting
    //    & GPS Spoofing") ──
    // Fetch the user's most recent report to run an impossible-travel check.
    const lastReport = await Issue.findOne({ reportedBy: user._id })
      .sort({ createdAt: -1 })
      .select('location.coordinates createdAt')
      .lean();

    const lastReportData = lastReport
      ? {
          latitude: lastReport.location?.coordinates?.[1],
          longitude: lastReport.location?.coordinates?.[0],
          createdAt: lastReport.createdAt,
        }
      : null;

    const spoofCheck = detectGpsSpoofing(
      parseFloat(latitude),
      parseFloat(longitude),
      lastReportData
    );

    if (spoofCheck.isSpoofed) {
      // Flag the user's trust score down and reject the report.
      user.trustScore = Math.max(0, (user.trustScore || 50) - 10);
      await user.save();
      throw new ApiError(
        400,
        `Location verification failed: ${spoofCheck.reason}. Please ensure GPS is enabled and you are at the reported location.`
      );
    }

    // ── Content moderation (doc edge case: NSFW) ──
    const text = `${title || ''} ${description || ''}`;
    const moderation = await moderateContent(
      req.file ? req.file.buffer : null,
      req.file ? req.file.mimetype : null,
      text
    );

    let isHidden = false;
    let moderationFlag = 'approved';

    if (moderation.isFlagged) {
      // Silently accept but hide + shadow-ban the reporter.
      isHidden = true;
      moderationFlag = moderation.flag;
      user.isShadowBanned = true;
      await user.save();
    }

    // ── Resolve area name ──
    const resolvedArea = areaName || resolveAreaName(latitude, longitude);

    // ── Build issue document ──
    const issueData = {
      reportedBy: user._id,
      isAnonymous: isAnon,
      reporterHash: crypto.createHash('sha256').update(user._id.toString()).digest('hex'),
      reporterName: isAnon ? null : user.name,
      title: title || 'Civic issue reported',
      description: description || 'No description provided.',
      category: category || 'Other',
      severity: severity || 'Medium',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        areaName: resolvedArea,
      },
      ward: resolvedArea,
      isHidden,
      moderationFlag,
      timeline: [
        {
          status: 'Reported',
          note: 'Issue reported by citizen.',
          updatedBy: user._id,
          updatedByName: isAnon ? 'Community Member' : user.name,
          timestamp: new Date(),
        },
      ],
    };

    // ── AI image analysis if a photo was uploaded (§5.1.2) ──
    if (req.file) {
      issueData.imageUrl = await uploadImage(req.file.buffer, 'charcha_issues');

      // If title/description/category weren't provided, run AI analysis.
      if (!title || !description || !category) {
        const analysis = await analyzeIssueImage(
          req.file.buffer,
          req.file.mimetype
        );
        if (!title) issueData.title = analysis.title;
        if (!description) issueData.description = analysis.description;
        if (!category) issueData.category = analysis.category;
        if (!severity) issueData.severity = analysis.severity;
        issueData.suggestedDepartment = analysis.suggestedDepartment;
      }
    }

    // ── AI-assisted department routing (§5.1.11.2) ──
    const dept = await Department.findOne({
      handledCategories: issueData.category,
      isActive: true,
    });
    if (dept) {
      issueData.assignedDepartment = dept.name;
      issueData.suggestedDepartment = dept.name;
    }

    // ── Create the issue ──
    const issue = await Issue.create(issueData);

    // ── AI priority scoring (§5.2.2) ──
    const { score, priority } = await calculatePriorityScore(issue);
    issue.priorityScore = score;
    issue.priority = priority;
    issue.dueAt = setDueDate();

    // Reporter auto-supports their own issue.
    issue.supporters.push({ user: user._id });
    issue.supportCount = 1;

    await issue.save();

    // ── Update user reputation (§5.2.5) ──
    user.reportsSubmitted += 1;
    user.impactScore += 5;
    await user.save();

    // ── Notify relevant authorities ──
    if (issue.assignedDepartment) {
      const authorities = await User.find({
        role: { $in: ['department_head', 'ward_officer'] },
        department: issue.assignedDepartment,
        isActive: true,
      });
      await Promise.all(
        authorities.map((a) =>
          Notification.create({
            user: a._id,
            title: 'New Issue Assigned',
            message: `A new ${issue.category} issue has been reported in ${resolvedArea}.`,
            type: 'issue_update',
            relatedIssue: issue._id,
          })
        )
      );
    }

    // Update heatmap in the background
    triggerHeatmapRecompute();

    return sendSuccess(res, 201, 'Issue reported successfully', {
      issue: issue.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get the community feed of issues (§5.1.5).
 * GET /api/issues
 * Query: category, status, ward, priority, lat, lng, radius, page, limit, sort
 */
export const getIssues = async (req, res, next) => {
  try {
    const {
      category,
      status,
      ward,
      priority,
      lat,
      lng,
      radius = 5000,
      page = 1,
      limit = 20,
      sort = 'recent',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));

    // Build filter — never expose hidden/shadow-banned issues on the feed.
    const filter = { isHidden: false };

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (ward) filter.ward = ward;
    if (priority) filter.priority = priority;

    // Geo filter (nearby issues).
    if (lat && lng) {
      const earthRadiusInMeters = 6378100;
      filter.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseInt(radius, 10) / earthRadiusInMeters,
          ],
        },
      };
    }

    // Role-based scoping for authorities
    if (req.user) {
      if (req.user.role === 'super_admin' && req.user.location && req.user.location.areaName) {
        filter['location.areaName'] = req.user.location.areaName;
      } else if (req.user.role === 'department_head') {
        filter.assignedDepartment = req.user.department;
        if (req.user.location && req.user.location.areaName) {
          filter['location.areaName'] = req.user.location.areaName;
        }
      } else if (req.user.role === 'ward_officer') {
        filter.ward = req.user.ward;
        if (req.user.location && req.user.location.areaName) {
          filter['location.areaName'] = req.user.location.areaName;
        }
      }
    }

    // Sort options.
    let sortOption = { createdAt: -1 };
    if (sort === 'priority') sortOption = { priorityScore: -1 };
    if (sort === 'support') sortOption = { supportCount: -1 };
    if (sort === 'confirmed') sortOption = { confirmationCount: -1 };

    const skip = (pageNum - 1) * limitNum;

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('reportedBy', 'name avatarUrl')
        .populate('assignedTo', 'name designation')
        .lean(),
      Issue.countDocuments(filter),
    ]);

    // Attach per-user interaction flags if authenticated.
    const userId = req.user?._id?.toString();
    const issuesWithFlags = issues.map((issue) => {
      const hasSupported = userId
        ? issue.supporters.some((s) => s.user?.toString() === userId)
        : false;
      const hasConfirmed = userId
        ? issue.confirmations.some((c) => c.user?.toString() === userId)
        : false;
      return {
        ...issue,
        hasSupported,
        hasConfirmed,
        supporters: undefined,
        confirmations: undefined,
      };
    });

    return sendSuccess(res, 200, 'Issues retrieved', {
      issues: issuesWithFlags,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get a single issue by ID with full timeline (§5.1.7).
 * GET /api/issues/:id
 */
export const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name avatarUrl')
      .populate('assignedTo', 'name designation department')
      .populate('resolvedBy', 'name designation')
      .lean();

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    // Attach per-user interaction flags.
    const userId = req.user?._id?.toString();
    issue.hasSupported = userId
      ? issue.supporters.some((s) => s.user?.toString() === userId)
      : false;
    issue.hasConfirmed = userId
      ? issue.confirmations.some((c) => c.user?.toString() === userId)
      : false;

    return sendSuccess(res, 200, 'Issue retrieved', { issue });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Confirm an issue exists (§5.1.6 — "Confirm Issue Exists").
 * POST /api/issues/:id/confirm
 */
export const confirmIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    const userId = req.user._id;
    const alreadyConfirmed = issue.confirmations.some(
      (c) => c.user.toString() === userId.toString()
    );

    if (alreadyConfirmed) {
      // Un-confirm
      issue.confirmations = issue.confirmations.filter(
        (c) => c.user.toString() !== userId.toString()
      );
      issue.confirmationCount = issue.confirmations.length;

      await User.findByIdAndUpdate(userId, {
        $inc: { confirmationsSubmitted: -1, impactScore: -2 },
      });
    } else {
      // Confirm
      issue.confirmations.push({ user: userId });
      issue.confirmationCount = issue.confirmations.length;

      await User.findByIdAndUpdate(userId, {
        $inc: { confirmationsSubmitted: 1, impactScore: 2 },
      });
    }

    // Recalculate priority (confirmations boost priority).
    const { score, priority } = await calculatePriorityScore(issue);
    issue.priorityScore = score;
    issue.priority = priority;

    await issue.save();

    return sendSuccess(res, 200, alreadyConfirmed ? 'Confirmation removed' : 'Issue confirmed', {
      confirmationCount: issue.confirmationCount,
      priorityScore: issue.priorityScore,
      hasConfirmed: !alreadyConfirmed,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Support an issue (§5.1.6 — "Support Issue").
 * POST /api/issues/:id/support
 */
export const supportIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    const userId = req.user._id;
    const alreadySupported = issue.supporters.some(
      (s) => s.user.toString() === userId.toString()
    );

    if (alreadySupported) {
      // Un-support
      issue.supporters = issue.supporters.filter(
        (s) => s.user.toString() !== userId.toString()
      );
      issue.supportCount = issue.supporters.length;
    } else {
      // Support
      issue.supporters.push({ user: userId });
      issue.supportCount = issue.supporters.length;
    }

    // Recalculate priority.
    const { score, priority } = await calculatePriorityScore(issue);
    issue.priorityScore = score;
    issue.priority = priority;

    await issue.save();

    return sendSuccess(res, 200, alreadySupported ? 'Support removed' : 'Issue supported', {
      supportCount: issue.supportCount,
      priorityScore: issue.priorityScore,
      hasSupported: !alreadySupported,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Share an issue (increments share count).
 * POST /api/issues/:id/share
 */
export const shareIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    issue.shareCount = (issue.shareCount || 0) + 1;
    await issue.save();

    return sendSuccess(res, 200, 'Issue shared', {
      shareCount: issue.shareCount,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Update issue status (authority workflow — §5.1.7, §5.1.11.3).
 * PATCH /api/issues/:id/status
 * Body: { status, note }
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = [
      'Reported',
      'Verified',
      'Assigned',
      'In Progress',
      'Resolved',
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    // Authority scope check: ward officers can only touch their ward.
    if (req.user.role === 'ward_officer' && issue.ward !== req.user.ward) {
      throw new ApiError(403, 'You can only update issues in your ward');
    }

    issue.status = status;
    issue.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      timestamp: new Date(),
    });

    // Reset overdue flag when action is taken.
    if (status !== 'Resolved') {
      issue.isOverdue = false;
      issue.dueAt = setDueDate();
    }

    await issue.save();

    // Notify the reporter.
    await Notification.create({
      user: issue.reportedBy,
      title: 'Issue Status Updated',
      message: `Your issue "${issue.title}" is now ${status}.`,
      type: 'issue_update',
      relatedIssue: issue._id,
    });

    return sendSuccess(res, 200, 'Status updated', {
      issue: issue.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Assign an issue to a department/officer (§5.1.11.2).
 * PATCH /api/issues/:id/assign
 * Body: { assignedTo (userId), assignedDepartment }
 */
export const assignIssue = async (req, res, next) => {
  try {
    const { assignedTo, assignedDepartment } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    if (assignedDepartment) issue.assignedDepartment = assignedDepartment;

    if (assignedTo) {
      const officer = await User.findById(assignedTo);
      if (!officer) throw new ApiError(404, 'Officer not found');
      issue.assignedTo = officer._id;
      issue.assignedOfficer = officer.name;
    }

    issue.status = 'Assigned';
    issue.timeline.push({
      status: 'Assigned',
      note: `Issue assigned to ${issue.assignedOfficer || issue.assignedDepartment}.`,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      timestamp: new Date(),
    });

    await issue.save();

    // Notify the assigned officer.
    if (issue.assignedTo) {
      await Notification.create({
        user: issue.assignedTo,
        title: 'Issue Assigned to You',
        message: `Issue "${issue.title}" has been assigned to you.`,
        type: 'issue_update',
        relatedIssue: issue._id,
      });
    }

    return sendSuccess(res, 200, 'Issue assigned', {
      issue: issue.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Mark an issue as resolved with evidence (§5.2.4).
 * PATCH /api/issues/:id/resolve  (multipart: field "resolutionImage")
 * Body: resolutionNote, latitude, longitude, capturedAt
 */
export const resolveIssue = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Resolution evidence photo is required');
    }

    const { resolutionNote, latitude, longitude, capturedAt } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');

    // Authority scope check.
    if (req.user.role === 'ward_officer' && issue.ward !== req.user.ward) {
      throw new ApiError(403, 'You can only resolve issues in your ward');
    }

    issue.resolutionImageUrl = getPublicUrl(req.file);
    issue.resolutionNote = resolutionNote || 'Issue resolved.';

    const resLat = latitude ? parseFloat(latitude) : null;
    const resLng = longitude ? parseFloat(longitude) : null;
    const resCapturedAt = capturedAt ? new Date(capturedAt) : new Date();

    issue.resolutionMeta = {
      capturedAt: resCapturedAt,
      latitude: resLat,
      longitude: resLng,
    };

    // ── EXIF / Evidence Verification (doc edge case: "Jugaad Resolution
    //    — Fake Evidence") ──
    // Prevents officers from uploading old / stock / off-location photos
    // to fake a resolution. Three checks:
    //   1. GPS proximity — the after-photo must be near the issue location.
    //   2. Timestamp recency — the photo must be captured after the issue
    //      was reported (not a recycled old photo).
    //   3. AI before/after comparison — Gemini Vision verifies the issue
    //      actually appears fixed in the after-photo.
    const verificationWarnings = [];

    // 1. GPS proximity check (within 500m of the reported issue).
    if (
      resLat != null &&
      resLng != null &&
      issue.location?.coordinates?.length === 2
    ) {
      const issueLat = issue.location.coordinates[1];
      const issueLng = issue.location.coordinates[0];
      const distanceMeters = haversineDistance(
        resLat,
        resLng,
        issueLat,
        issueLng
      );
      if (distanceMeters > 500) {
        verificationWarnings.push(
          `Resolution photo GPS is ${Math.round(
            distanceMeters
          )}m from the issue location (expected within 500m).`
        );
      }
    } else {
      verificationWarnings.push(
        'Resolution photo GPS metadata missing — cannot verify location.'
      );
    }

    // 2. Timestamp recency check (photo must be taken after the issue was
    //    reported, and within the last 24 hours).
    if (resCapturedAt) {
      const issueCreatedAt = issue.createdAt || issue.timeline?.[0]?.timestamp;
      if (issueCreatedAt && resCapturedAt < new Date(issueCreatedAt)) {
        verificationWarnings.push(
          'Resolution photo timestamp predates the issue report — possible recycled photo.'
        );
      }
      const hoursSinceCapture =
        (Date.now() - resCapturedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCapture > 24) {
        verificationWarnings.push(
          `Resolution photo is ${Math.round(
            hoursSinceCapture
          )}h old — should be a fresh capture.`
        );
      }
    } else {
      verificationWarnings.push(
        'Resolution photo timestamp missing — cannot verify recency.'
      );
    }

    // 3. AI before/after comparison (Gemini Vision).
    let aiVerification = null;
    try {
      if (req.file) {
        issue.resolutionImageUrl = await uploadImage(req.file.buffer, 'charcha_resolutions');

        aiVerification = await verifyResolutionImage(
          req.file.buffer,
          req.file.mimetype,
          issue
        );
        if (!aiVerification.isResolved) {
          verificationWarnings.push(
            `AI verification: issue does not appear resolved (${aiVerification.note}).`
          );
        }
      }
    } catch (err) {
      // AI failure should not block resolution — record it as a warning.
      verificationWarnings.push('AI before/after verification unavailable.');
    }

    // Store the verification outcome on the issue for transparency.
    issue.resolutionVerificationWarnings = verificationWarnings;
    issue.resolutionAiConfidence = aiVerification?.confidence ?? null;

    issue.resolvedBy = req.user._id;
    issue.resolvedAt = new Date();
    issue.status = 'Resolved';
    issue.isOverdue = false;

    issue.timeline.push({
      status: 'Resolved',
      note: resolutionNote || 'Issue marked as resolved with evidence.',
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      timestamp: new Date(),
    });

    await issue.save();

    // Update authority performance metrics.
    const resolutionDays =
      (Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { issuesResolved: 1, resolutionScore: 10 },
    });

    // Notify the reporter + supporters.
    const notifyUsers = new Set([issue.reportedBy.toString()]);
    issue.supporters.forEach((s) => notifyUsers.add(s.user.toString()));

    await Promise.all(
      [...notifyUsers].map((uid) =>
        Notification.create({
          user: uid,
          title: 'Issue Resolved',
          message: `The issue "${issue.title}" has been marked as resolved. Please verify.`,
          type: 'resolution',
          relatedIssue: issue._id,
        })
      )
    );

    return sendSuccess(res, 200, 'Issue resolved with evidence', {
      issue: issue.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Citizen verifies a resolution (§5.2.4 — "Resolved or Still Not Resolved").
 * POST /api/issues/:id/verify-resolution
 * Body: { isResolved }
 */
export const verifyResolution = async (req, res, next) => {
  try {
    const { isResolved } = req.body;
    if (typeof isResolved !== 'boolean') {
      throw new ApiError(400, 'isResolved (boolean) is required');
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new ApiError(404, 'Issue not found');
    if (issue.status !== 'Resolved') {
      throw new ApiError(400, 'Issue is not yet marked as resolved');
    }

    const userId = req.user._id;
    const alreadyVerified = issue.resolutionVerifications.some(
      (v) => v.user.toString() === userId.toString()
    );
    if (alreadyVerified) {
      throw new ApiError(400, 'You have already verified this resolution');
    }

    issue.resolutionVerifications.push({ user: userId, isResolved });
    if (isResolved) {
      issue.resolutionVerificationCount += 1;
    } else {
      issue.resolutionDisputeCount += 1;
    }

    await issue.save();

    // Update user reputation.
    await User.findByIdAndUpdate(userId, {
      $inc: { verificationsSubmitted: 1, impactScore: 3 },
    });

    return sendSuccess(res, 200, 'Resolution verified', {
      resolutionVerificationCount: issue.resolutionVerificationCount,
      resolutionDisputeCount: issue.resolutionDisputeCount,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get issues reported by the current user (§5.2.5 — profile).
 * GET /api/issues/my-reports
 */
export const getMyReports = async (req, res, next) => {
  try {
    const issues = await Issue.find({ reportedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 200, 'Your reports retrieved', { issues });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Hash a reporter ID for anonymous accountability (§5.1.3, §9).
 * Backend-only; never sent to the frontend.
 */
const hashReporter = (id) =>
  crypto.createHash('sha256').update(id).digest('hex');

export default {
  analyzeImage,
  checkDuplicates,
  createIssue,
  getIssues,
  getIssueById,
  confirmIssue,
  supportIssue,
  updateStatus,
  assignIssue,
  resolveIssue,
  verifyResolution,
  getMyReports,
};
