/**
 * Implementing Agency Model
 * Collection: implementing_agencies
 * Master registry of public executing agencies per architecture.md §10.1
 */
const mongoose = require('mongoose');

const AGENCY_TYPES = [
  'PWD',
  'RES',
  'CPWD',
  'MUNICIPAL_CORP',
  'ZILA_PANCHAYAT',
  'IRRIGATION_DEPT',
  'FOREST_DEPT',
  'OTHER',
];

const implementingAgencySchema = new mongoose.Schema(
  {
    agency_id: {
      type: String,
      required: [true, 'agency_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,50}$/, 'agency_id format is invalid'],
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [200, 'name cannot exceed 200 characters'],
    },
    type: {
      type: String,
      required: [true, 'type is required'],
      enum: {
        values: AGENCY_TYPES,
        message: '{VALUE} is not a recognized agency type',
      },
      default: 'OTHER',
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true,
      index: true,
    },
    contact_person: {
      type: String,
      trim: true,
    },
    contact_phone: {
      type: String,
      trim: true,
    },
    contact_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    is_active: {
      type: Boolean,
      default: true,
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
    collection: 'implementing_agencies',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

implementingAgencySchema.index({ state: 1, district: 1 });

const ImplementingAgency = mongoose.model(
  'ImplementingAgency',
  implementingAgencySchema
);

module.exports = {
  ImplementingAgency,
  implementingAgencySchema,
  AGENCY_TYPES,
};

