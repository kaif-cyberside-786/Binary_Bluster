/**
 * Agency Concentration Model
 * Collection: agency_concentration
 * Derived statistics of work-value share per agency, district, and year
 * Implements Herfindahl-style concentration indicator per architecture.md §10.1 & §13
 */
const mongoose = require('mongoose');

const agencyConcentrationSchema = new mongoose.Schema(
  {
    agency_id: {
      type: String,
      required: [true, 'agency_id is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
      index: true,
    },
    year: {
      type: String,
      required: [true, 'year is required'],
      trim: true,
    },
    work_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    share_of_value_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    herfindahl_index_contribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_concentration_flagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    computed_at: {
      type: Date,
      default: Date.now,
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
    collection: 'agency_concentration',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

agencyConcentrationSchema.index(
  { agency_id: 1, district: 1, year: 1 },
  { unique: true }
);

const AgencyConcentration = mongoose.model(
  'AgencyConcentration',
  agencyConcentrationSchema
);

module.exports = {
  AgencyConcentration,
  agencyConcentrationSchema,
};

