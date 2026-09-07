/**
 * Project Recommendation Model
 * Collection: project_recommendations
 * Original MP recommendation per architecture.md §10.1
 * Write-once / immutable historical record.
 */
const mongoose = require('mongoose');
const appendOnlyPlugin = require('./plugins/appendOnlyPlugin');

const projectRecommendationSchema = new mongoose.Schema(
  {
    project_id: {
      type: String,
      required: [true, 'project_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
    },
    location: {
      block: { type: String, trim: true },
      gram_panchayat: { type: String, trim: true },
      village_ward: { type: String, trim: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    estimated_cost: {
      type: Number,
      required: [true, 'estimated_cost is required'],
      min: [0, 'estimated_cost cannot be negative'],
    },
    work_category: {
      type: String,
      required: [true, 'work_category is required'],
      trim: true,
    },
    recommended_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recommended_by: {
      type: String,
      required: [true, 'recommended_by (user_id) is required'],
      trim: true,
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
    collection: 'project_recommendations',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Apply append-only plugin to enforce immutability
projectRecommendationSchema.plugin(appendOnlyPlugin);

const ProjectRecommendation = mongoose.model(
  'ProjectRecommendation',
  projectRecommendationSchema
);

module.exports = {
  ProjectRecommendation,
  projectRecommendationSchema,
};

