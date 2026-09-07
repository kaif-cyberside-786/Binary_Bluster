/**
 * Work Completion Model
 * Collection: work_completion
 * Summary of projects recommended, sanctioned, and completed per MP.
 */
const mongoose = require('mongoose');

const workCompletionSchema = new mongoose.Schema(
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
    total_recommended: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_sanctioned: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_in_progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_cost_completed: {
      type: Number,
      default: 0,
      min: 0,
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
    collection: 'work_completion',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

workCompletionSchema.index({ mp_id: 1, financial_year: 1 }, { unique: true });

const WorkCompletion = mongoose.model('WorkCompletion', workCompletionSchema);

module.exports = {
  WorkCompletion,
  workCompletionSchema,
};

