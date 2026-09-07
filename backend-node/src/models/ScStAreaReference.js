/**
 * SC/ST Area Reference Model
 * Collection: sc_st_area_reference
 * Static government reference classification for SC/ST-majority areas per architecture.md §10.1
 */
const mongoose = require('mongoose');

const SC_ST_CLASSIFICATIONS = ['SC_MAJORITY', 'ST_MAJORITY', 'OTHER'];

const scStAreaReferenceSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true,
      index: true,
    },
    constituency: {
      type: String,
      required: [true, 'constituency is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
    },
    classification: {
      type: String,
      required: [true, 'classification is required'],
      enum: {
        values: SC_ST_CLASSIFICATIONS,
        message: '{VALUE} is not a recognized SC/ST classification',
      },
    },
    sc_population_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    st_population_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    is_real_government_data: {
      type: Boolean,
      default: true,
    },
    is_synthetic: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'sc_st_area_reference',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

scStAreaReferenceSchema.index({ state: 1, constituency: 1 }, { unique: true });

const ScStAreaReference = mongoose.model(
  'ScStAreaReference',
  scStAreaReferenceSchema
);

module.exports = {
  ScStAreaReference,
  scStAreaReferenceSchema,
  SC_ST_CLASSIFICATIONS,
};

