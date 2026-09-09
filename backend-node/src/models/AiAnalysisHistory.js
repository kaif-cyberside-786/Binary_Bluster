/**
 * AI Analysis History Model
 * Collection: ai_analysis_history
 * Historical timeline of risk score evaluations per architecture.md §10.1 and Phase 9 Section 15.
 * Append-only immutable history log.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const aiAnalysisHistorySchema = new mongoose.Schema(
  {
    history_id: {
      type: String,
      required: [true, 'history_id is required'],
      unique: true,
      trim: true,
    },
    analysis_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    overall_score: {
      type: Number,
      required: [true, 'overall_score is required'],
      min: [0, 'overall_score cannot be negative'],
      max: [100, 'overall_score cannot exceed 100'],
    },
    risk_level: {
      type: String,
      required: [true, 'risk_level is required'],
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
    component_scores: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    signals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    top_contributors: [
      {
        type: { type: String },
        score: { type: Number },
        weighted_contribution: { type: Number },
        weight: { type: Number },
        severity: { type: String },
        reason: { type: String },
      },
    ],
    explanation: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'DEGRADED', 'FAILED'],
      default: 'COMPLETED',
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    triggered_by: {
      type: String,
      required: [true, 'triggered_by is required'],
      trim: true,
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
    collection: 'ai_analysis_history',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

aiAnalysisHistorySchema.virtual('score').get(function () {
  return this.overall_score;
});

aiAnalysisHistorySchema.virtual('level').get(function () {
  return this.risk_level;
});

aiAnalysisHistorySchema.index({ project_id: 1, computed_at: -1 });

aiAnalysisHistorySchema.plugin(appendOnlyPlugin);

const AiAnalysisHistory = mongoose.model(
  'AiAnalysisHistory',
  aiAnalysisHistorySchema
);

module.exports = {
  AiAnalysisHistory,
  aiAnalysisHistorySchema,
};
