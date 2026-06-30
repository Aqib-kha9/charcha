import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema
 * ─────────────────────────────────────────────────────────
 * Represents both citizens and authorities in CHARCHA.
 *
 * Implements the full RBAC hierarchy (doc §5.1.11.1):
 *   citizen            → public-facing app (report, verify, support, track)
 *   ward_officer       → field officer scoped to ONE ward/zone
 *   department_head    → chief engineer / dept head, sees whole department
 *   super_admin        → Municipal Commissioner / Smart City officer, city-wide
 *
 * Also carries:
 *  - Civic reputation (impactScore, verificationsSubmitted, confirmationsSubmitted)
 *  - Trust score (spam prevention — doc §10 "Spam Reporting")
 *  - Authority governance fields (ward, zone, designation, resolutionScore)
 *  - Shadow-ban flag (NSFW / troll handling — doc edge case "Trolls and NSFW")
 *  - Anonymous reporting via hashed identity (doc §5.1.3)
 */
const userSchema = new mongoose.Schema(
  {
    // ── Identity ──
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },

    // ── RBAC (doc §5.1.11.1) ──
    role: {
      type: String,
      enum: ['citizen', 'ward_officer', 'department_head', 'super_admin'],
      default: 'citizen',
    },
    // Authority-only: department name this user belongs to.
    department: {
      type: String,
      default: null,
    },
    // Authority-only: ward/zone a ward_officer is scoped to.
    ward: {
      type: String,
      default: null,
    },
    // Authority-only: zone grouping (e.g. "Central Lucknow").
    zone: {
      type: String,
      default: null,
    },
    // Authority-only: human-readable job title (e.g. "Chief Engineer, PWD").
    designation: {
      type: String,
      default: null,
    },
    // Whether this authority account is officially verified (domain-based).
    isVerifiedAuthority: {
      type: Boolean,
      default: false,
    },

    // ── Civic Reputation (Phase 2 — doc §5.2.5) ──
    impactScore: {
      type: Number,
      default: 0,
    },
    reportsSubmitted: {
      type: Number,
      default: 0,
    },
    issuesResolved: {
      type: Number,
      default: 0,
    },
    verificationsSubmitted: {
      type: Number,
      default: 0,
    },
    confirmationsSubmitted: {
      type: Number,
      default: 0,
    },

    // ── Authority Performance Metrics (doc §5.1.11.4) ──
    resolutionScore: {
      type: Number,
      default: 0,
    },
    avgResolutionDays: {
      type: Number,
      default: 0,
    },
    satisfactionRating: {
      type: Number,
      default: 0,
    },
    // Current escalation level for issues under this user (0 = none).
    escalationLevel: {
      type: Number,
      default: 0,
    },

    // ── Trust & Safety (doc §10 — Spam Reporting, NSFW handling) ──
    // Trust score to prevent spam. Starts at 50; rises with verified
    // contributions, falls with disputed/fake reports. Low trust →
    // rate-limited reporting (doc edge case: "3 reports/day").
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    // Shadow-ban flag. When true, the user's reports are silently accepted
    // but never shown on the public feed (doc edge case: "Trolls and NSFW").
    isShadowBanned: {
      type: Boolean,
      default: false,
    },

    // ── Location (hyperlocal intelligence — doc §5.1.4) ──
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
      areaName: {
        type: String,
        default: '',
      },
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

// ── Virtuals ──
// Reputation badge derived from the impact score (mirrors frontend logic).
userSchema.virtual('reputationBadge').get(function () {
  if (this.impactScore >= 500) return 'Civic Champion';
  if (this.impactScore >= 250) return 'Community Leader';
  if (this.impactScore >= 100) return 'Active Citizen';
  if (this.impactScore >= 25) return 'Contributor';
  return 'Newcomer';
});

// ── Password hashing ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Password comparison ──
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── JSON serialization ──
// Ensure virtuals are included when converting to a plain object.
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);

export default User;
