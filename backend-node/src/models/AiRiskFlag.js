/**
 * AI Risk Flag Model
 * Collection: ai_risk_flags
 * Individual AI and deterministic rule findings per architecture.md §10.1, §13, and Phase 9 requirements.
 * Append-only immutable finding record.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const RISK_FLAG_TYPES = [
  'COST_ANOMALY',
  'DUPLICATE_RISK',
  'DUPLICATE_OVERLAP',
  'SPECIFICATION_DEVIATION',
  'SPEC_DEVIATION',
  'PAYMENT_PROGRESS_ANOMALY',
  'PAYMENT_PROGRESS_MISMATCH',
  'DELAY_RISK',
  'DELAY_STALENESS',
  'COMPLIANCE_FLAG',
  'SC_ST_NON_COMPLIANCE',
  'UC_OVERDUE',
  'HISTORICAL_PATTERN',
  'AGENCY_CONCENTRATION_RISK',
];

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const FLAG_STATUSES = ['ACTIVE', 'RESOLVED', 'DISMISSED'];

const aiRiskFlagSchema = new mongoose.Schema(
  {
    flag_id: {
      type: String,
      required: [true, 'flag_id is required'],
      unique: true,
      trim: true,
    },
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    flag_type: {
      type: String,
      required: [true, 'flag_type is required'],
      enum: {
        values: RISK_FLAG_TYPES,
        message: '{VALUE} is not a valid risk flag type',
      },
      index: true,
    },
    risk_score: {
      type: Number,
      required: [true, 'risk_score is required'],
      min: [0, 'risk_score cannot be less than 0'],
      max: [100, 'risk_score cannot exceed 100'],
    },
    severity: {
      type: String,
      required: [true, 'severity is required'],
      enum: {
        values: SEVERITY_LEVELS,
        message: '{VALUE} is not a valid severity level',
      },
      index: true,
    },
    explanation: {
      type: String,
      required: [true, 'explanation is required'],
      trim: true,
    },
    model_or_rule: {
      type: String,
      required: [true, 'model_or_rule is required'],
      trim: true,
    },
    signals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    analysis_id: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'PYTHON_AI_SERVICE',
      trim: true,
    },
    status: {
      type: String,
      enum: FLAG_STATUSES,
      default: 'ACTIVE',
      index: true,
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
    collection: 'ai_risk_flags',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for score -> risk_score
aiRiskFlagSchema.virtual('score').get(function () {
  return this.risk_score;
});

aiRiskFlagSchema.index({ project_id: 1, created_at: -1 });
aiRiskFlagSchema.index({ project_id: 1, flag_type: 1 });

aiRiskFlagSchema.plugin(appendOnlyPlugin);

const AiRiskFlag = mongoose.model('AiRiskFlag', aiRiskFlagSchema);

module.exports = {
  AiRiskFlag,
  aiRiskFlagSchema,
  RISK_FLAG_TYPES,
  SEVERITY_LEVELS,
  FLAG_STATUSES,
};
