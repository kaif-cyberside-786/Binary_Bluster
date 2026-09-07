/**
 * Agency Performance Model
 * Collection: agency_performance
 * Historical execution performance per agency per architecture.md §10.1
 */
const mongoose = require('mongoose');

const agencyPerformanceSchema = new mongoose.Schema(
  {
    agency_id: {
      type: String,
      required: [true, 'agency_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    period: {
      type: String,
      required: [true, 'period is required'],
      trim: true,
    },
    total_assigned_works: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed_works: {
      type: Number,
      default: 0,
      min: 0,
    },
    completion_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    avg_delay_days: {
      type: Number,
      default: 0,
    },
    cost_deviation_avg_percentage: {
      type: Number,
      default: 0,
    },
    adverse_inspection_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    performance_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
    collection: 'agency_performance',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

agencyPerformanceSchema.index({ agency_id: 1, period: 1 }, { unique: true });

const AgencyPerformance = mongoose.model(
  'AgencyPerformance',
  agencyPerformanceSchema
);

module.exports = {
  AgencyPerformance,
  agencyPerformanceSchema,
};

