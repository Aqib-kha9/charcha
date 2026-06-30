import mongoose from 'mongoose';

/**
 * Issue Schema
 * ─────────────────────────────────────────────────────────
 * Represents a civic issue reported by a citizen.
 *
 * Covers every feature in the CHARCHA doc:
 *  - AI-generated content (title, description, category, severity, dept) §5.1.2
 *  - Anonymous reporting via hashed identity §5.1.3
 *  - Geo-tagged location §5.1.4
 *  - Community verification (confirm) + support §5.1.6
 *  - Full lifecycle timeline §5.1.7
 *  - Duplicate detection (50m radius) §5.1.10
 *  - AI priority scoring §5.2.2
 *  - Resolution evidence (after-photo + verification) §5.2.4
 *  - Authority governance (ward, assigned officer, escalation) §5.1.11
 */
const issueSchema = new mongoose.Schema(
  {
    // ── Reporter ──
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    // Hashed identity for anonymous accountability (backend only, never sent
    // to the frontend). Lets us detect spam from anonymous users without
    // exposing who they are (doc §5.1.3 + §9 "Hashed user ID").
    reporterHash: {
      type: String,
      default: null,
    },
    // Denormalized reporter name for the public feed (respects anonymity).
    // For anonymous reports this stays null and the feed shows "Community Member".
    reporterName: {
      type: String,
      default: null,
    },

    // ── AI-generated content (doc §5.1.2) ──
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Pothole',
        'Garbage',
        'Water Leakage',
        'Broken Streetlight',
        'Public Infrastructure Damage',
        'Other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    suggestedDepartment: {
      type: String,
      default: null,
    },

    // ── Media ──
    imageUrl: {
      type: String,
      default: null,
    },
    // EXIF / capture metadata for the "before" photo (doc edge case:
    // "Jugaad Resolution" — we verify GPS + timestamp of after-photos).
    imageMeta: {
      capturedAt: { type: Date, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    // ── Resolution Evidence (doc §5.2.4) ──
    resolutionImageUrl: {
      type: String,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: null,
    },
    resolutionMeta: {
      capturedAt: { type: Date, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Citizens who verified the resolution as truly fixed.
    resolutionVerifications: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isResolved: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolutionVerificationCount: {
      type: Number,
      default: 0,
    },
    resolutionDisputeCount: {
      type: Number,
      default: 0,
    },
    // EXIF verification warnings from the "Jugaad Resolution" edge case.
    // Populated when an officer submits a resolution photo — records any
    // GPS proximity, timestamp recency, or AI before/after discrepancies.
    resolutionVerificationWarnings: {
      type: [String],
      default: [],
    },
    // AI confidence (0-1) from the before/after image comparison.
    resolutionAiConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },

    // ── Location (geo-tagged — doc §5.1.4) ──
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
      areaName: {
        type: String,
        default: '',
      },
    },
    // Ward/zone this issue belongs to (used for ward-officer scoping).
    ward: {
      type: String,
      default: '',
    },

    // ── Status lifecycle (doc §5.1.7) ──
    // Reported → Verified → Assigned → In Progress → Resolved
    status: {
      type: String,
      enum: ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'],
      default: 'Reported',
    },
    assignedDepartment: {
      type: String,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Denormalized officer name for quick display.
    assignedOfficer: {
      type: String,
      default: null,
    },

    // ── Community engagement (doc §5.1.6) ──
    // "Confirm Issue Exists" — validates the report's reality.
    confirmations: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // "Support Issue" — adds public demand weight.
    supporters: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    confirmationCount: {
      type: Number,
      default: 0,
    },
    supportCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },

    // ── AI Priority Scoring (doc §5.2.2) ──
    // Score (0–100) based on severity, population affected, location
    // importance, and community support count.
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },

    // ── Authority Governance (doc §5.1.11) ──
    // Escalation level: 0 = none, 1 = escalated to Dept Head, 2 = Super Admin.
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    // Deadline by which action must be taken before auto-escalation.
    dueAt: {
      type: Date,
      default: null,
    },
    // Whether this issue has breached the inactivity threshold (7 days).
    isOverdue: {
      type: Boolean,
      default: false,
    },

    // ── Moderation (doc edge case: "Trolls and NSFW") ──
    // If AI flags NSFW content, the report is silently hidden from the feed
    // and the reporter is shadow-banned.
    isHidden: {
      type: Boolean,
      default: false,
    },
    moderationFlag: {
      type: String,
      enum: ['none', 'pending', 'nsfw', 'spam', 'approved'],
      default: 'none',
    },

    // ── Timeline (doc §5.1.7) ──
    timeline: [
      {
        status: { type: String },
        note: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedByName: { type: String, default: null },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
// Geospatial index for duplicate detection & nearby queries (doc §5.1.10).
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ priorityScore: -1 });
issueSchema.index({ ward: 1, status: 1 });
issueSchema.index({ assignedDepartment: 1, status: 1 });

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
