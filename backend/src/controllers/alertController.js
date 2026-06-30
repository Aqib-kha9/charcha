import CivicAlert from '../models/CivicAlert.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Civic Alert Controller (doc §5.2.3 — Civic Alerts & Local Updates)
 * ─────────────────────────────────────────────────────────
 * Turns the app into a living neighbourhood news feed.
 */

/**
 * Get active civic alerts, optionally filtered by area/proximity.
 * GET /api/alerts
 */
export const getAlerts = async (req, res, next) => {
  try {
    const { areaName, lat, lng, radius = 10000, limit = 20 } = req.query;

    const filter = { isActive: true };

    if (areaName) {
      filter.areaName = { $regex: areaName, $options: 'i' };
    }

    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius, 10),
        },
      };
    }

    const alerts = await CivicAlert.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('issuedBy', 'name designation')
      .lean();

    return sendSuccess(res, 200, 'Alerts retrieved', { alerts });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Create a civic alert (authority only).
 * POST /api/alerts
 */
export const createAlert = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type = 'update',
      areaName,
      latitude,
      longitude,
      source,
      affectedCount,
      expiresAt,
    } = req.body;

    if (!title || !message || !areaName) {
      throw new ApiError(400, 'Title, message, and areaName are required');
    }

    const alert = await CivicAlert.create({
      title,
      message,
      type,
      areaName,
      location:
        latitude && longitude
          ? { type: 'Point', coordinates: [longitude, latitude] }
          : undefined,
      source: source || req.user.department || 'CHARCHA',
      issuedBy: req.user._id,
      affectedCount,
      expiresAt,
    });

    return sendSuccess(res, 201, 'Alert created', { alert });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default { getAlerts, createAlert };
