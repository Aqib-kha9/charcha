import mongoose from 'mongoose';

/**
 * Department Schema
 * ─────────────────────────────────────────────────────────
 * Represents a local government authority/department.
 * Used for the Authority Directory (discovery & trust layer — doc §5.1.8)
 * and for AI-assisted issue routing (doc §5.1.11.2).
 *
 * Each department declares the issue categories it handles, so the AI
 * routing layer can map a detected category → responsible department.
 */
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    responsibilityArea: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    contact: {
      phone: { type: String, default: null },
      email: { type: String, default: null },
      website: { type: String, default: null },
      address: { type: String, default: null },
    },
    // Issue categories this department handles (drives AI routing).
    handledCategories: [
      {
        type: String,
        enum: [
          'Pothole',
          'Garbage',
          'Water Leakage',
          'Broken Streetlight',
          'Public Infrastructure Damage',
          'Other',
        ],
      },
    ],
    // Service area (e.g. "Lucknow City", "Uttar Pradesh").
    serviceArea: {
      type: String,
      default: 'Municipal',
    },
    // Denormalized count of issues assigned to this department (for the
    // directory display). Updated by the issue service on assignment.
    issueCount: {
      type: Number,
      default: 0,
    },
    // Department head reference (doc §5.1.11.1).
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

const Department = mongoose.model('Department', departmentSchema);

export default Department;
