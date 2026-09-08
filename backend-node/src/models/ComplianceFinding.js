/**
 * Compliance Finding Model
 * Collection: compliance_findings
 * Deterministic rule-based compliance findings per architecture.md §10.1 and design.md §5.19
 * Strictly distinct from AI risk flags (zero LLM/ML dependency).
 */
const mongoose = require('mongoose');

const COMPLIANCE_STATUSES = ['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'];
const COMPLIANCE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
const COMPLIANCE_RULE_CATEGORIES = [
  'FINANCIAL',
  'DOCUMENTATION',
  'TIMELINE',
  'QUOTA',
  'ELIGIBILITY',
];

const complianceFindingSchema = new mongoose.Schema(
  {
    finding_id: {
      type: String,
      required: [true, 'finding_id is required'],
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
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true,
      index: true,
    },
    rule_id: {
      type: String,
      required: [true, 'rule_id is required'],
      trim: true,
      uppercase: true,
    },
    rule_category: {
      type: String,
      required: [true, 'rule_category is required'],
      enum: {
        values: COMPLIANCE_RULE_CATEGORIES,
        message: '{VALUE} is not a valid compliance rule category',
      },
      index: true,
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: COMPLIANCE_STATUSES,
        message: '{VALUE} is not a valid compliance status',
      },
      index: true,
    },
    severity: {
      type: String,
      required: [true, 'severity is required'],
      enum: {
        values: COMPLIANCE_SEVERITIES,
        message: '{VALUE} is not a valid severity level',
      },
      default: 'MEDIUM',
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    is_dismissed: {
      type: Boolean,
      default: false,
    },
    evaluated_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    evaluated_by: {
      type: String,
      default: 'SYSTEM',
      trim: true,
    },
  },
  {
    collection: 'compliance_findings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

complianceFindingSchema.index({ project_id: 1, rule_id: 1 }, { unique: true });
complianceFindingSchema.index({ district: 1, status: 1 });
complianceFindingSchema.index({ state: 1, status: 1 });
complianceFindingSchema.index({ mp_id: 1, status: 1 });

const ComplianceFinding = mongoose.model(
  'ComplianceFinding',
  complianceFindingSchema
);

module.exports = {
  ComplianceFinding,
  complianceFindingSchema,
  COMPLIANCE_STATUSES,
  COMPLIANCE_SEVERITIES,
  COMPLIANCE_RULE_CATEGORIES,
};

