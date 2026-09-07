/**
 * AI Risk Score Model
 * Collection: ai_risk_scores
 * Current combined explainable risk score per project per architecture.md §10.1 & §13
 */
const mongoose = require('mongoose');

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

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
      payment_progress: { type: Number, default: 0, min: 0, max: 100 },
      timeline_delay: { type: Number, default: 0, min: 0, max: 100 },
      agency_concentration: { type: Number, default: 0, min: 0, max: 100 },
      statutory_compliance: { type: Number, default: 0, min: 0, max: 100 },
    },
    confidence: {
      type: Number,
      default: 0.95,
      min: 0,
      max: 1,
    },
    contributing_signals: [
      {
        signal_name: { type: String, required: true },
        weight: { type: Number, required: true },
        score: { type: Number, required: true },
        explanation: { type: String, required: true },
      },
    ],
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
  }
);

aiRiskScoreSchema.index({ risk_level: 1, overall_score: -1 });

const AiRiskScore = mongoose.model('AiRiskScore', aiRiskScoreSchema);

module.exports = {
  AiRiskScore,
  aiRiskScoreSchema,
  RISK_LEVELS,
};

