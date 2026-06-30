import HeatmapZone from '../models/HeatmapZone.js';
import Issue from '../models/Issue.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Heatmap Controller (doc §5.2.7 — Community Heatmap)
 * ─────────────────────────────────────────────────────────
 * A live, color-coded map that visualises the civic health of every
 * neighbourhood (Red / Yellow / Green zones).
 */

/**
 * Get all heatmap zones.
 * GET /api/heatmap
 */
export const getHeatmap = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.areaName) {
      const parts = req.query.areaName.split(',').map(s => s.trim());
      if (parts.length > 1) {
        // Match zones in the same city/state context (e.g. "Lucknow, Uttar Pradesh")
        const zilaContext = parts.slice(1).join(', ');
        query = { areaName: { $regex: zilaContext, $options: 'i' } };
      } else {
        query = { areaName: { $regex: req.query.areaName, $options: 'i' } };
      }
    }

    const zones = await HeatmapZone.find(query).sort({ healthScore: 1 }).lean();

    // Derive color from health score.
    const zonesWithColor = zones.map((z) => ({
      ...z,
      color:
        z.healthScore >= 70
          ? 'green'
          : z.healthScore >= 40
            ? 'yellow'
            : 'red',
    }));

    return sendSuccess(res, 200, 'Heatmap retrieved', {
      zones: zonesWithColor,
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Recompute heatmap zones from current issue data.
 * POST /api/heatmap/recompute  (super_admin / system)
 */
export const triggerHeatmapRecompute = async () => {
  try {
    // Aggregate issues by areaName.
    const aggregates = await Issue.aggregate([
      {
        $group: {
          _id: '$location.areaName',
          totalIssues: { $sum: 1 },
          resolvedIssues: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
          },
          openIssues: {
            $sum: { $cond: [{ $ne: ['$status', 'Resolved'] }, 1, 0] },
          },
          avgLat: { $avg: '$location.coordinates.latitude' },
          avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
          avgLat2: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
        },
      },
    ]);

    for (const agg of aggregates) {
      if (!agg._id) continue;

      const resolutionRate =
        agg.totalIssues > 0
          ? (agg.resolvedIssues / agg.totalIssues) * 100
          : 100;

      // Health score: weighted by resolution rate and open-issue ratio.
      const openRatio =
        agg.totalIssues > 0 ? agg.openIssues / agg.totalIssues : 0;
      const healthScore = Math.round(
        Math.max(0, Math.min(100, resolutionRate - openRatio * 30))
      );

      await HeatmapZone.findOneAndUpdate(
        { areaName: agg._id },
        {
          areaName: agg._id,
          location: {
            type: 'Point',
            coordinates: [agg.avgLng || 80.9465, agg.avgLat2 || 26.8567],
          },
          healthScore,
          totalIssues: agg.totalIssues,
          resolvedIssues: agg.resolvedIssues,
          openIssues: agg.openIssues,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('Heatmap recompute error:', error);
  }
};

export const recomputeHeatmap = async (req, res, next) => {
  try {
    await triggerHeatmapRecompute();
    return sendSuccess(res, 200, 'Heatmap recomputed', {});
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

export default { getHeatmap, recomputeHeatmap };
