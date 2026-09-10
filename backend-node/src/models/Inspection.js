/**
 * Inspection Model
 * Collection: inspections
 * Physical inspection lifecycle per architecture.md §10.1
 * Status lifecycle: RECOMMENDED -> PENDING_DECISION -> ASSIGNED -> SCHEDULED -> IN_PROGRESS -> COMPLETED -> RESULT_RECORDED
 * Canonical results: NO_ISSUE | REVIEW_REQUIRED | ESCALATE
 */
const mongoose = require('mongoose');

const INSPECTION_STATUSES = [
  'RECOMMENDED',
  'PENDING_DECISION',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'RESULT_RECORDED',
];

const INSPECTION_RESULTS = ['NO_ISSUE', 'REVIEW_REQUIRED', 'ESCALATE'];

const INSPECTION_TYPES = [
  'STATUTORY_10_PERCENT_DA',
  'STATUTORY_1_PERCENT_STATE',
  'STATE_1_PERCENT',
  'SPECIAL_RISK_TRIGGER',
];

const INSPECTION_PRIORITIES = ['ROUTINE', 'MEDIUM', 'HIGH', 'URGENT'];

const RECOMMENDATION_SOURCES = [
  'AI_RISK_TRIGGER',
  'OFFICER_RECOMMENDATION',
  'STATUTORY_QUOTA',
  'COMPLIANCE_TRIGGER',
];

const inspectionSchema = new mongoose.Schema(
  {
    inspection_id: {
      type: String,
      required: [true, 'inspection_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    inspection_type: {
      type: String,
      required: [true, 'inspection_type is required'],
      enum: {
        values: INSPECTION_TYPES,
        message: '{VALUE} is not a valid inspection type',
      },
      default: 'STATUTORY_10_PERCENT_DA',
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: INSPECTION_STATUSES,
        message: '{VALUE} is not a valid inspection lifecycle status',
      },
      default: 'RECOMMENDED',
      index: true,
    },
    result: {
      type: String,
      enum: {
        values: [...INSPECTION_RESULTS, null],
        message: '{VALUE} is not a recognized inspection result',
      },
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return this.status === 'RESULT_RECORDED';
        },
        message: 'result can only be set when status is RESULT_RECORDED',
      },
      index: true,
    },
    priority: {
      type: String,
      required: [true, 'priority is required'],
      enum: {
        values: INSPECTION_PRIORITIES,
        message: '{VALUE} is not a valid inspection priority',
      },
      default: 'ROUTINE',
      index: true,
    },
    priority_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    recommendation_source: {
      type: String,
      enum: {
        values: RECOMMENDATION_SOURCES,
        message: '{VALUE} is not a valid recommendation source',
      },
      default: 'OFFICER_RECOMMENDATION',
      index: true,
    },
    quota_year: {
      type: Number,
      default: () => new Date().getFullYear(),
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    assigned_officer_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    assigned_officer_name: {
      type: String,
      default: null,
      trim: true,
    },
    assigned_by: {
      type: String,
      default: null,
      trim: true,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    scheduled_date: {
      type: Date,
      default: null,
    },
    scheduled_by: {
      type: String,
      default: null,
      trim: true,
    },
    scheduled_at: {
      type: Date,
      default: null,
    },
    completed_date: {
      type: Date,
      default: null,
    },
    completed_by: {
      type: String,
      default: null,
      trim: true,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    result_recorded_by: {
      type: String,
      default: null,
      trim: true,
    },
    result_recorded_at: {
      type: Date,
      default: null,
    },
    evidence_document_ids: {
      type: [String],
      default: [],
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
    },
    findings_summary: {
      type: String,
      default: null,
      trim: true,
    },
    adverse_flags_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    audit_trail: [
      {
        from_status: { type: String, required: true },
        to_status: { type: String, required: true },
        transitioned_by: { type: String, required: true },
        transitioned_at: { type: Date, default: Date.now },
        reason: { type: String, default: null },
      },
    ],
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
    collection: 'inspections',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

inspectionSchema.index({ project_id: 1, status: 1, priority: 1 });
inspectionSchema.index({ state: 1, district: 1, status: 1, priority_score: -1 });
inspectionSchema.index({ quota_year: 1, inspection_type: 1, status: 1 });

const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = {
  Inspection,
  inspectionSchema,
  INSPECTION_STATUSES,
  INSPECTION_RESULTS,
  INSPECTION_TYPES,
  INSPECTION_PRIORITIES,
  RECOMMENDATION_SOURCES,
};

