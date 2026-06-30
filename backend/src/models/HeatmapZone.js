import mongoose from 'mongoose';

/**
 * HeatmapZone Schema
 * ─────────────────────────────────────────────────────────
 * Phase 2 feature: Community Heatmap (doc §5.2.7).
 *
 * A live, color-coded map that visualises the civic health of every
 * neighbourhood (Red / Yellow / Green zones). Zones are aggregated from
 * issue data and recomputed periodically by the analytics service.
 *
 * healthScore (0–100): higher = healthier.
 *   >= 70 → green (Healthy)
 *   >= 40 → yellow (Needs Attention)
 *   <  40 → red (Critical)
 */
const heatmapZoneSchema = new mongoose.Schema(
  {
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    radiusKm: {
      type: Number,
      default: 1.5,
    },
    // Civic health score (0–100). Higher = healthier.
    healthScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalIssues: {
      type: Number,
      default: 0,
    },
    resolvedIssues: {
      type: Number,
      default: 0,
    },
    openIssues: {
      type: Number,
      default: 0,
    },
    avgResolutionDays: {
      type: Number,
      default: 0,
    },
    topCategory: {
      type: String,
      default: 'Other',
    },
    // When this zone was last recomputed.
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

heatmapZoneSchema.index({ location: '2dsphere' });
heatmapZoneSchema.index({ areaName: 1 }, { unique: true });

const HeatmapZone = mongoose.model('HeatmapZone', heatmapZoneSchema);

export default HeatmapZone;
