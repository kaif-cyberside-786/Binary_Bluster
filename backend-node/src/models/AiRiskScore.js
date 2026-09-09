/**
 * AI Risk Score Model
 * Collection: ai_risk_scores
 * Current combined explainable project-level risk score per architecture.md §10.1, §13, and Phase 9 requirements.
 */
const mongoose = require('mongoose');

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const AI_STATUSES = ['AI_ANALYSIS_COMPLETE', 'AI_ANALYSIS_PENDING', 'AI_ANALYSIS_UNAVAILABLE'];

const aiRiskScoreSchema = new mongoose.Schema(
  {
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    overall_score: {
      type: Number,
      required: [true, 'overall_score is required'],
      min: [0, 'overall_score cannot be less than 0'],
      max: [100, 'overall_score cannot exceed 100'],
    },
    risk_level: {
      type: String,
      required: [true, 'risk_level is required'],
      enum: {
        values: RISK_LEVELS,
        message: '{VALUE} is not a valid risk level',
      },
      index: true,
    },
    component_scores: {
      cost_anomaly: { type: Number, default: 0, min: 0, max: 100 },
      duplicate: { type: Number, default: 0, min: 0, max: 100 },
      specification: { type: Number, default: 0, min: 0, max: 100 },
      payment_mismatch: { type: Number, default: 0, min: 0, max: 100 },
      delay: { type: Number, default: 0, min: 0, max: 100 },
      compliance: { type: Number, default: 0, min: 0, max: 100 },
      historical_pattern: { type: Number, default: 0, min: 0, max: 100 },
      // Phase 8 backwards compatibility aliases
      payment_progress: { type: Number, default: 0, min: 0, max: 100 },
      timeline_delay: { type: Number, default: 0, min: 0, max: 100 },
      statutory_compliance: { type: Number, default: 0, min: 0, max: 100 },
    },
    signals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    top_contributors: [
      {
        type: { type: String, required: true },
        score: { type: Number, required: true },
        weighted_contribution: { type: Number, default: 0 },
        weight: { type: Number, default: 0 },
        severity: { type: String, default: 'LOW' },
        reason: { type: String, default: '' },
        evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    contributing_signals: [
      {
        signal_name: { type: String, required: true },
        weight: { type: Number, required: true },
        score: { type: Number, required: true },
        explanation: { type: String, required: true },
      },
    ],
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    ai_status: {
      type: String,
      enum: AI_STATUSES,
      default: 'AI_ANALYSIS_COMPLETE',
      index: true,
    },
    analysis_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    confidence: {
      type: Number,
      default: 0.95,
      min: 0,
      max: 1,
    },
    computed_at: {
      type: Date,
      default: Date.now,
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
    collection: 'ai_risk_scores',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases per Section 5 recommended structure
aiRiskScoreSchema.virtual('score').get(function () {
  return this.overall_score;
});

aiRiskScoreSchema.virtual('level').get(function () {
  return this.risk_level;
});

aiRiskScoreSchema.virtual('calculated_at').get(function () {
  return this.computed_at;
});

aiRiskScoreSchema.index({ risk_level: 1, overall_score: -1 });

const AiRiskScore = mongoose.model('AiRiskScore', aiRiskScoreSchema);

module.exports = {
  AiRiskScore,
  aiRiskScoreSchema,
  RISK_LEVELS,
  AI_STATUSES,
};
