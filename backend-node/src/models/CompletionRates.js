/**
 * Completion Rates Model
 * Collection: completion_rates
 * Performance completion rate and delay metrics per MP.
 */
const mongoose = require('mongoose');

const completionRatesSchema = new mongoose.Schema(
  {
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    financial_year: {
      type: String,
      required: [true, 'financial_year is required'],
      trim: true,
    },
    completion_rate_percentage: {
      type: Number,
      min: [0, 'completion_rate_percentage cannot be less than 0'],
      max: [100, 'completion_rate_percentage cannot exceed 100'],
      default: 0,
    },
    avg_completion_days: {
      type: Number,
      min: [0, 'avg_completion_days cannot be negative'],
      default: 0,
    },
    delay_rate_percentage: {
      type: Number,
      min: [0, 'delay_rate_percentage cannot be less than 0'],
      max: [100, 'delay_rate_percentage cannot exceed 100'],
      default: 0,
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
    collection: 'completion_rates',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

completionRatesSchema.index({ mp_id: 1, financial_year: 1 }, { unique: true });

const CompletionRates = mongoose.model('CompletionRates', completionRatesSchema);

module.exports = {
  CompletionRates,
  completionRatesSchema,
};

