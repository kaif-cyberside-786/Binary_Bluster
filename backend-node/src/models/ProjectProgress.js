/**
 * Project Progress Model
 * Collection: project_progress
 * Execution progress reports per architecture.md §10.1
 * Append-only historical log of milestones and physical status.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const PROGRESS_STAGES = [
  'NOT_STARTED',
  'SITE_PREPARATION',
  'FOUNDATION',
  'SUPERSTRUCTURE',
  'FINISHING',
  'PHYSICALLY_COMPLETE',
  'COMMISSIONED',
];

const projectProgressSchema = new mongoose.Schema(
  {
    progress_id: {
      type: String,
      required: [true, 'progress_id is required'],
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
    percent_complete: {
      type: Number,
      required: [true, 'percent_complete is required'],
      min: [0, 'percent_complete cannot be less than 0'],
      max: [100, 'percent_complete cannot exceed 100'],
    },
    stage: {
      type: String,
      required: [true, 'stage is required'],
      enum: {
        values: PROGRESS_STAGES,
        message: '{VALUE} is not a valid progress stage',
      },
    },
    physical_summary: {
      type: String,
      required: [true, 'physical_summary is required'],
      trim: true,
    },
    geo_coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    photos_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    reported_by: {
      type: String,
      required: [true, 'reported_by (user_id) is required'],
      trim: true,
    },
    reported_at: {
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
    collection: 'project_progress',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for timeline queries
projectProgressSchema.index({ project_id: 1, reported_at: -1 });

projectProgressSchema.plugin(appendOnlyPlugin);

const ProjectProgress = mongoose.model('ProjectProgress', projectProgressSchema);

module.exports = {
  ProjectProgress,
  projectProgressSchema,
  PROGRESS_STAGES,
};

