/**
 * Project Model
 * Collection: projects
 * Central historical project memory per architecture.md §10.1
 * Authoritative lifecycle status: MP_RECOMMENDED -> DISTRICT_REVIEW -> CLARIFICATION_REQUIRED / HELD -> SANCTIONED -> IN_PROGRESS -> COMPLETED
 */
const mongoose = require('mongoose');

const PROJECT_STATUSES = [
  'MP_RECOMMENDED',
  'DISTRICT_REVIEW',
  'CLARIFICATION_REQUIRED',
  'HELD',
  'INSPECTION_REQUESTED',
  'ESCALATED',
  'SANCTIONED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
];

const PROJECT_CATEGORIES = [
  'Drinking Water',
  'Education',
  'Health & Family Welfare',
  'Roads & Bridges',
  'Sanitation',
  'Community Hall',
  'Rural Electrification',
  'Irrigation',
  'Sports Infrastructure',
  'Other Public Amenities',
];

const projectSchema = new mongoose.Schema(
  {
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{4,50}$/, 'project_id format is invalid'],
    },
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: PROJECT_CATEGORIES,
        message: '{VALUE} is not a recognized project category',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [300, 'title cannot exceed 300 characters'],
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: PROJECT_STATUSES,
        message: '{VALUE} is not a valid project lifecycle status',
      },
      default: 'MP_RECOMMENDED',
      index: true,
    },
    // Cross-cutting states (§10.1)
    is_inspection_required: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_escalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    estimated_cost: {
      type: Number,
      required: [true, 'estimated_cost is required'],
      min: [0, 'estimated_cost cannot be negative'],
    },
    sanctioned_cost: {
      type: Number,
      default: null,
      min: [0, 'sanctioned_cost cannot be negative'],
    },
    implementing_agency_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    sanction_date: {
      type: Date,
      default: null,
    },
    target_completion_date: {
      type: Date,
      default: null,
    },
    actual_completion_date: {
      type: Date,
      default: null,
    },
    is_real_government_data: {
      type: Boolean,
      default: false,
    },
    is_synthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'projects',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes
projectSchema.index({ district: 1, status: 1 });
projectSchema.index({ state: 1, district: 1, category: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = {
  Project,
  projectSchema,
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
};

