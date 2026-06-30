import mongoose from 'mongoose';

/**
 * CivicAlert Schema
 * ─────────────────────────────────────────────────────────
 * Phase 2 feature: Civic Alerts & Local Updates (doc §5.2.3).
 *
 * Turns the app into a living neighbourhood news feed — e.g.
 * "Water outage reported in your locality", "Pothole repair completed",
 * "Dengue prevention advisory".
 *
 * Alerts are created by:
 *  - Authorities (outages, advisories, scheduled work)
 *  - The system (auto-generated on resolution, high-priority detection)
 */
const civicAlertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    // 'outage' | 'advisory' | 'update' | 'achievement' | 'warning'
    type: {
      type: String,
      enum: ['outage', 'advisory', 'update', 'achievement', 'warning'],
      default: 'update',
    },
    areaName: {
      type: String,
      required: true,
    },
    // Geo point for proximity-based alert delivery.
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    // Who issued the alert (e.g. "Jal Nigam", "CHARCHA AI").
    source: {
      type: String,
      default: 'CHARCHA AI',
    },
    // Optional link to the issue that triggered this alert.
    relatedIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },
    // Optional issuing authority.
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // When the alert stops being active.
    expiresAt: {
      type: Date,
      default: null,
    },
    // Estimated number of affected residents.
    affectedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

civicAlertSchema.index({ location: '2dsphere' });
civicAlertSchema.index({ areaName: 1, createdAt: -1 });
civicAlertSchema.index({ expiresAt: 1 });

const CivicAlert = mongoose.model('CivicAlert', civicAlertSchema);

export default CivicAlert;
