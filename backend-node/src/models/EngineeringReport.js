/**
 * Engineering Report Model
 * Collection: engineering_reports
 * Engineer/Agency technical estimate submissions per architecture.md §10.1
 * Append-only versioned records (new version created rather than overwriting).
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const engineeringReportSchema = new mongoose.Schema(
  {
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    version: {
      type: Number,
      required: [true, 'version is required'],
      min: [1, 'version must be at least 1'],
      default: 1,
    },
    agency_id: {
      type: String,
      required: [true, 'agency_id is required'],
      trim: true,
      index: true,
    },
    technical_specs: {
      dimensions: { type: String, trim: true },
      materials: [{ type: String, trim: true }],
      specifications_summary: { type: String, trim: true },
      structural_notes: { type: String, trim: true },
    },
    detailed_estimate: {
      type: Number,
      required: [true, 'detailed_estimate is required'],
      min: [0, 'detailed_estimate cannot be negative'],
    },
    rate_schedule_basis: {
      type: String,
      trim: true,
      default: 'PWD State Schedule of Rates',
    },
    site_inspection_conducted: {
      type: Boolean,
      default: true,
    },
    site_inspection_date: {
      type: Date,
      default: null,
    },
    submitted_by: {
      type: String,
      required: [true, 'submitted_by (user_id) is required'],
      trim: true,
    },
    submitted_at: {
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
    collection: 'engineering_reports',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index: version uniqueness per project
engineeringReportSchema.index({ project_id: 1, version: 1 }, { unique: true });

engineeringReportSchema.plugin(appendOnlyPlugin);

const EngineeringReport = mongoose.model(
  'EngineeringReport',
  engineeringReportSchema
);

module.exports = {
  EngineeringReport,
  engineeringReportSchema,
};

