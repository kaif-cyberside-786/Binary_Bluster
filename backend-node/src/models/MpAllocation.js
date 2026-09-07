/**
 * MP Allocation Model
 * Collection: mp_allocation
 * Stores annual MPLADS allocation amounts per MP and constituency.
 * Refreshed per government source update (mutable).
 */
const mongoose = require('mongoose');

const mpAllocationSchema = new mongoose.Schema(
  {
    mp_id: {
      type: String,
      required: [true, 'mp_id is required'],
      trim: true,
      index: true,
    },
    mp_name: {
      type: String,
      required: [true, 'mp_name is required'],
      trim: true,
    },
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
    },
    year: {
      type: String,
      required: [true, 'year is required'],
      trim: true,
      default: '2024-2025',
    },
    allocated_amount: {
      type: Number,
      required: [true, 'allocated_amount is required'],
      min: [0, 'allocated_amount cannot be negative'],
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
    collection: 'mp_allocation',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound Unique Index: an MP can have only one allocation entry per financial year
mpAllocationSchema.index({ mp_id: 1, year: 1 }, { unique: true });
mpAllocationSchema.index({ state: 1, constituency: 1 });

const MpAllocation = mongoose.model('MpAllocation', mpAllocationSchema);

module.exports = {
  MpAllocation,
  mpAllocationSchema,
};

